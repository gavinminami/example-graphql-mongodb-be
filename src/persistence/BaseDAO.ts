import { Db, DeleteResult, Filter, ObjectId, WithId } from "mongodb";

export type BaseDbEntity = {
  [x: string]: any;
  _id?: ObjectId;
};

type QueryWithIdAndOwnerUserId = {
  _id: ObjectId;
  ownerUserId?: ObjectId;
};

export default class BaseDAO<T, DBE extends BaseDbEntity> {
  protected readonly collection;

  constructor({ db, collectionName }: { db: Db; collectionName: string }) {
    this.collection = db.collection<DBE>(collectionName);
  }

  public fromDbEntity<DBE extends BaseDbEntity>(dbEntity: DBE): T {
    const { _id, ...rest } = dbEntity as WithId<DBE>;
    return {
      ...rest,
      id: _id?.toString(),
    } as T;
  }

  public async findById({
    id,
    ownerUserId,
  }: {
    id: string;
    ownerUserId?: string;
  }): Promise<T | null> {
    const query: QueryWithIdAndOwnerUserId = {
      _id: new ObjectId(id),
    };

    if (ownerUserId) {
      query["ownerUserId"] = new ObjectId(ownerUserId);
    }

    const entity = await this.collection.findOne(query as Filter<DBE>);

    if (entity) {
      return this.fromDbEntity(entity);
    }
    return null;
  }

  public async deleteById({
    id,
    ownerUserId,
  }: {
    id: string;
    ownerUserId?: string;
  }): Promise<DeleteResult> {
    const query: QueryWithIdAndOwnerUserId = {
      _id: new ObjectId(id),
    };

    if (ownerUserId) {
      query["ownerUserId"] = new ObjectId(ownerUserId);
    }

    return await this.collection.deleteOne({
      _id: new ObjectId(id),
    } as Filter<DBE>);
  }

  public async find({ filter }: { filter: Filter<DBE> }): Promise<T[]> {
    const entities = await this.collection.find(filter).toArray();
    return entities.map((entity) => this.fromDbEntity(entity));
  }
}
