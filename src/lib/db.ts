import { MongoClient, ObjectId, type Collection, type Document } from "mongodb";
import type * as M from "@/lib/models";

/* ---------------- CONNECTION ---------------- */

const globalForMongo = globalThis as unknown as { mongoClient?: Promise<MongoClient> };

function connect(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set.");
  globalForMongo.mongoClient ??= new MongoClient(uri).connect().catch((e) => {
    globalForMongo.mongoClient = undefined;
    throw e;
  });
  return globalForMongo.mongoClient;
}

/** The app's database: `MONGODB_DB` if set, otherwise the one named in the connection string. */
export async function getDb() {
  return (await connect()).db(process.env.MONGODB_DB || undefined);
}

export async function closeDb() {
  const pending = globalForMongo.mongoClient;
  globalForMongo.mongoClient = undefined;
  if (pending) await (await pending).close();
}

/* ---------------- HELPERS ---------------- */

type Filter = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type SortSpec = Record<string, 1 | -1>;
type Fields<T> = Partial<Omit<T, "id">>;

/** Case-insensitive matching/sorting (like Postgres `mode: "insensitive"`). */
export const CI = { locale: "en", strength: 2 } as const;
const SORT_COLLATION = { locale: "en" } as const;

export function newId() {
  return new ObjectId().toHexString();
}

export function isDuplicateKey(e: unknown) {
  return (e as { code?: number } | null)?.code === 11000;
}

/** Documents are stored with `_id`; the app sees `id`. */
function toFilter(f: Filter): Filter {
  const out: Filter = {};
  for (const [key, value] of Object.entries(f)) {
    if (key === "id") out._id = value;
    else if ((key === "$or" || key === "$and" || key === "$nor") && Array.isArray(value)) out[key] = value.map(toFilter);
    else out[key] = value;
  }
  return out;
}

function fromDoc<T>(doc: Document): T {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest } as T;
}

/* ---------------- REPOSITORY ---------------- */

class Repo<T extends { id: string }> {
  constructor(
    readonly name: string,
    private readonly defaults: () => Fields<T> = () => ({}),
  ) {}

  private async collection(): Promise<Collection<Document>> {
    return (await getDb()).collection(this.name);
  }

  async find(filter: Filter = {}, opts: { sort?: SortSpec; limit?: number } = {}): Promise<T[]> {
    let cursor = (await this.collection()).find(toFilter(filter));
    if (opts.sort) cursor = cursor.collation(SORT_COLLATION).sort(opts.sort);
    if (opts.limit) cursor = cursor.limit(opts.limit);
    return (await cursor.toArray()).map((d) => fromDoc<T>(d));
  }

  async findOne(filter: Filter, opts: { sort?: SortSpec; caseInsensitive?: boolean } = {}): Promise<T | null> {
    let cursor = (await this.collection()).find(toFilter(filter)).limit(1);
    if (opts.caseInsensitive) cursor = cursor.collation(CI);
    else if (opts.sort) cursor = cursor.collation(SORT_COLLATION);
    if (opts.sort) cursor = cursor.sort(opts.sort);
    const [doc] = await cursor.toArray();
    return doc ? fromDoc<T>(doc) : null;
  }

  async get(id: string): Promise<T | null> {
    return this.findOne({ id });
  }

  async getOrThrow(filter: Filter): Promise<T> {
    const doc = await this.findOne(filter);
    if (!doc) throw new Error(`${this.name}: record not found`);
    return doc;
  }

  async count(filter: Filter = {}): Promise<number> {
    return (await this.collection()).countDocuments(toFilter(filter));
  }

  async create(data: Fields<T>, id: string = newId()): Promise<T> {
    const doc = { _id: id as unknown, ...this.defaults(), ...data } as Document;
    await (await this.collection()).insertOne(doc);
    return fromDoc<T>(doc);
  }

  async createMany(items: Fields<T>[], ids?: string[]): Promise<T[]> {
    if (!items.length) return [];
    const docs = items.map((data, i) => ({ _id: (ids?.[i] ?? newId()) as unknown, ...this.defaults(), ...data }) as Document);
    await (await this.collection()).insertMany(docs);
    return docs.map((d) => fromDoc<T>(d));
  }

  /** Sets fields on the first match; returns whether anything matched. */
  async update(filter: Filter, set: Fields<T>): Promise<boolean> {
    const res = await (await this.collection()).updateOne(toFilter(filter), { $set: set });
    return res.matchedCount > 0;
  }

  async updateMany(filter: Filter, set: Fields<T>): Promise<number> {
    const res = await (await this.collection()).updateMany(toFilter(filter), { $set: set });
    return res.matchedCount;
  }

  /**
   * Sets `set` on the document matching `filter` (plain equality fields), creating it
   * with `insert` + the defaults if it doesn't exist. Returns the document.
   */
  async upsert(filter: Filter, set: Fields<T>, insert: Fields<T> = {}): Promise<T> {
    const f = toFilter(filter);
    const onInsert: Document = { ...this.defaults(), ...insert };
    // A path can't appear in both $set and $setOnInsert, and filter fields are inserted automatically.
    for (const key of [...Object.keys(set), ...Object.keys(f)]) delete onInsert[key];
    if (!("_id" in f)) onInsert._id = newId();

    const update: Document = { $setOnInsert: onInsert };
    if (Object.keys(set).length) update.$set = set;
    const doc = await (await this.collection()).findOneAndUpdate(f, update, { upsert: true, returnDocument: "after" });
    return fromDoc<T>(doc as Document);
  }

  async delete(filter: Filter): Promise<boolean> {
    const res = await (await this.collection()).deleteOne(toFilter(filter));
    return res.deletedCount > 0;
  }

  async deleteMany(filter: Filter): Promise<number> {
    const res = await (await this.collection()).deleteMany(toFilter(filter));
    return res.deletedCount;
  }

  async aggregate<R extends Document = Document>(pipeline: Document[]): Promise<R[]> {
    return (await this.collection()).aggregate<R>(pipeline).toArray();
  }
}

/* ---------------- COLLECTIONS ---------------- */

const now = () => new Date();

export const db = {
  cohorts: new Repo<M.Cohort>("cohorts", () => ({ leaderPersonId: null, createdAt: now() })),
  brands: new Repo<M.Brand>("brands", () => ({ addedMonthKey: null, archivedMonthKey: null })),
  ips: new Repo<M.Ip>("ips", () => ({ sortOrder: 0 })),
  people: new Repo<M.Person>("people", () => ({
    appRole: "EDITOR",
    email: null,
    passwordHash: null,
    mustChangePassword: true,
    active: true,
    createdAt: now(),
  })),
  sessions: new Repo<M.Session>("sessions", () => ({ createdAt: now() })),
  personAssignments: new Repo<M.PersonAssignment>("personAssignments"),
  brandIpMonths: new Repo<M.BrandIpMonth>("brandIpMonths", () => ({ target: 0, achieved: 0, live: 0, updatedAt: now() })),
  monthSettings: new Repo<M.MonthSetting>("monthSettings", () => ({ baseOverride: null, achievedOverride: null })),
  appSettings: new Repo<M.AppSetting>("appSettings"),
  festivals: new Repo<M.Festival>("festivals", () => ({ sortOrder: 0, active: true })),
  festiveEntries: new Repo<M.FestiveEntry>("festiveEntries", () => ({ target: 0, achieved: 0, live: 0 })),
  nonIpEntries: new Repo<M.NonIpEntry>("nonIpEntries", () => ({ target: 0, achieved: 0, live: 0 })),
  rotationCycles: new Repo<M.RotationCycle>("rotationCycles", () => ({ createdAt: now() })),
  rotationEntries: new Repo<M.RotationEntry>("rotationEntries", () => ({ achieved: 0 })),
  rotationAssignments: new Repo<M.RotationAssignment>("rotationAssignments"),
  trades: new Repo<M.Trade>("trades", () => ({ note: null, createdAt: now() })),
  cohortWeeklyStatuses: new Repo<M.CohortWeeklyStatus>("cohortWeeklyStatuses", () => ({ status: "PENDING" })),
  attendanceDays: new Repo<M.AttendanceDay>("attendanceDays", () => ({ clockOut: null, note: null })),
};

/** Sum of `fields` per month key over [first, last], from a collection that has a `monthKey`. */
export async function sumByMonth(
  repo: Repo<{ id: string }>,
  fields: string[],
  first: string,
  last: string,
): Promise<Map<string, Record<string, number>>> {
  const group: Document = { _id: "$monthKey" };
  for (const f of fields) group[f] = { $sum: `$${f}` };
  const rows = await repo.aggregate([{ $match: { monthKey: { $gte: first, $lte: last } } }, { $group: group }]);
  return new Map(rows.map(({ _id, ...sums }) => [String(_id), sums as Record<string, number>]));
}

/**
 * Creates the unique/lookup indexes the app relies on (the equivalent of a
 * migration). Safe to run repeatedly; the seed script runs it on every deploy.
 */
export async function ensureIndexes() {
  const database = await getDb();
  const unique = (collection: string, keys: Record<string, 1>, extra: Document = {}) =>
    database.collection(collection).createIndex(keys, { unique: true, ...extra });
  const plain = (collection: string, keys: Record<string, 1>, extra: Document = {}) =>
    database.collection(collection).createIndex(keys, extra);

  await Promise.all([
    unique("cohorts", { code: 1 }),
    unique("brands", { cohortId: 1, name: 1 }),
    unique("ips", { name: 1 }),
    unique("people", { name: 1 }),
    unique("people", { email: 1 }, { partialFilterExpression: { email: { $type: "string" } } }),
    unique("sessions", { tokenHash: 1 }),
    plain("sessions", { personId: 1 }),
    plain("sessions", { expiresAt: 1 }, { expireAfterSeconds: 0 }),
    unique("personAssignments", { personId: 1, ipId: 1, role: 1 }),
    plain("personAssignments", { ipId: 1 }),
    unique("brandIpMonths", { monthKey: 1, brandId: 1, ipId: 1 }),
    unique("monthSettings", { monthKey: 1 }),
    unique("appSettings", { key: 1 }),
    unique("festiveEntries", { monthKey: 1, brandId: 1, festivalId: 1, format: 1 }),
    unique("nonIpEntries", { monthKey: 1, brandId: 1 }),
    unique("rotationCycles", { monthKey: 1 }),
    unique("rotationEntries", { cycleId: 1, ipId: 1, week: 1 }),
    unique("rotationAssignments", { entryId: 1, cohortId: 1 }),
    plain("trades", { cycleId: 1 }),
    unique("cohortWeeklyStatuses", { cycleId: 1, cohortId: 1, ipId: 1, week: 1 }),
    unique("attendanceDays", { personId: 1, day: 1 }),
    plain("attendanceDays", { day: 1 }),
  ]);
}
