import { User } from 'discord.js';
import { mock } from 'jest-mock-extended';
import { mocked } from 'ts-jest/utils';
import { prisma } from '../prismaClient';
import { forRibbons, redis } from '../redisClient';
import { UserProvider } from './userProvider';
jest.mock('../redisClient');

const mockRedis = mocked(redis, true);
const userProvider = new UserProvider(prisma, mockRedis);

const mockUserProps = { id: '1', tag: '#1' };
const mockUser = { ...mock<User>(), ...mockUserProps };

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('#getRibbons', () => {
  const findUnique = jest.spyOn(prisma.user, 'findUnique');

  afterEach(() => {
    findUnique.mockReset();
    mockRedis.get.mockReset();
  });

  afterAll(() => {
    findUnique.mockRestore();
  });

  test('should search in redis', async () => {
    await userProvider.getRibbons(mockUser as any);
    expect(mockRedis.get).toBeCalledTimes(1);
  });

  describe('found in cache', () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValueOnce('420');
    });
    test('should not hit db', async () => {
      await userProvider.getRibbons(mockUser as any);
      expect(findUnique).not.toBeCalled();
    });
    test('should return value given by redis', async () => {
      const res = await userProvider.getRibbons(mockUser as any);
      expect(res).toBe(420);
    });
    test('should extend ttl by 60 seconds', async () => {
      await userProvider.getRibbons(mockUser as any);
      expect(mockRedis.expire).toBeCalledWith(forRibbons(mockUser.id), 60);
    });
  });

  describe('not in cache', () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValueOnce(null);
    });
    test('should hit the db', async () => {
      findUnique.mockResolvedValueOnce({} as any);
      await userProvider.getRibbons(mockUser as any);
      expect(findUnique).toBeCalledTimes(1);
    });
    describe('found in db', () => {
      beforeEach(() => {
        findUnique.mockResolvedValueOnce({ ribbons: 420 } as any);
      });
      test('should return the value from db', async () => {
        const res = await userProvider.getRibbons(mockUser as any);
        expect(res).toBe(420);
      });
      test('should cache the retrieved value', async () => {
        await userProvider.getRibbons(mockUser as any);
        expect(mockRedis.set).toBeCalledWith(
          forRibbons(mockUser.id),
          420,
          'ex',
          60,
        );
      });
    });
    describe('not found in db', () => {
      beforeEach(() => {
        findUnique.mockResolvedValueOnce({} as any);
      });
      test('returns 0', async () => {
        const res = await userProvider.getRibbons(mockUser as any);
        expect(res).toBe(0);
      });
      test('caches 0', async () => {
        await userProvider.getRibbons(mockUser as any);
        expect(mockRedis.set).toBeCalledWith(
          forRibbons(mockUser.id),
          0,
          'ex',
          60,
        );
      });
    });
  });
});

describe('#incrRibbons', () => {
  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  test('should try an error if a negative incrby is given', () => {
    return expect(
      userProvider.incrRibbons(mockUser as any, -10),
    ).rejects.toThrow();
  });
  test('should cache the value from db', async () => {
    const upsert = jest.spyOn(prisma.user, 'upsert');
    upsert.mockResolvedValueOnce({ ribbons: 10 } as any);
    await userProvider.incrRibbons(mockUser as any, 10);
    expect(mockRedis.set).toBeCalledWith(forRibbons(mockUser.id), 10, 'ex', 60);
    upsert.mockRestore();
  });

  describe('user does not exist', () => {
    test('should create the user', async () => {
      const _user = await prisma.user.findUnique({
        where: { userId: mockUser.id },
      });
      expect(_user).toBeNull();
      await userProvider.incrRibbons(mockUser as any, 10);
      const created = await prisma.user.findUnique({
        where: { userId: mockUser.id },
      });
      expect(created).toMatchObject({ userId: '1', ribbons: 10 });
    });
  });
  describe('user exists', () => {
    const data = { userId: '1', tag: '#1', ribbons: 10 };
    beforeEach(async () => {
      await prisma.user.create({ data });
    });
    test('increment the ribbon count', async () => {
      await userProvider.incrRibbons(mockUser as any, 10);
      const res = await prisma.user.findUnique({
        where: { userId: mockUser.id },
      });
      expect(res).toMatchObject({ ...data, ribbons: 20 });
    });
  });
});

describe('#decrRibbons', () => {
  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  test('caches to redis with 60 seconds ttl', async () => {
    const $transaction = jest.spyOn(prisma, '$transaction');
    $transaction.mockResolvedValueOnce([1, { ribbons: 10 }]);
    await userProvider.decrRibbons(mockUser as any, 10);
    expect(mockRedis.set).toBeCalledWith(forRibbons(mockUser.id), 10, 'ex', 60);
    $transaction.mockRestore();
  });

  describe('a negative decrby is given', () => {
    test('throws an error', () => {
      expect(userProvider.decrRibbons(mockUser as any, -1)).rejects.toThrow();
    });
  });

  describe('decrby more than current stock', () => {
    beforeEach(async () => {
      await prisma.user.create({
        data: { userId: mockUser.id, tag: mockUser.tag, ribbons: 10 },
      });
    });
    test('sets to zero', async () => {
      await userProvider.decrRibbons(mockUser as any, 20);
      const res = await prisma.user.findUnique({
        where: { userId: mockUser.id },
        select: { ribbons: true },
      });
      expect(res?.ribbons).toBe(0);
    });
  });

  describe('decrby less than current stock', () => {
    beforeEach(async () => {
      await prisma.user.create({
        data: { userId: mockUser.id, tag: mockUser.tag, ribbons: 10 },
      });
    });
    test('decreases correctly', async () => {
      await userProvider.decrRibbons(mockUser as any, 5);
      const res = await prisma.user.findUnique({
        where: { userId: mockUser.id },
        select: { ribbons: true },
      });
      expect(res?.ribbons).toBe(5);
    });
  });

  describe('user does not exist', () => {
    test('should create the user with 0 ribbons', async () => {
      const _user = await prisma.user.findUnique({
        where: { userId: mockUser.id },
      });
      expect(_user).toBeNull(); // check that its not in the db

      await userProvider.decrRibbons(mockUser as any, 10);
      const res = await prisma.user.findUnique({
        where: { userId: mockUser.id },
        select: { ribbons: true },
      });
      expect(res?.ribbons).toBe(0);
    });
  });
});

describe('#getGlobalTopRibbons', () => {
  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { userId: '1', tag: '#1', ribbons: 1 },
        { userId: '2', tag: '#2', ribbons: 2 },
        { userId: '3', tag: '#3', ribbons: 3 },
      ],
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
  });

  test('returns in correct order', async () => {
    const res = await userProvider.getGlobalTopRibbons();
    expect(res).toEqual([
      { tag: '#3', ribbons: 3 },
      { tag: '#2', ribbons: 2 },
      { tag: '#1', ribbons: 1 },
    ]);
  });
});

describe('#getTopRibbonsForUsers', () => {
  const mockUser1 = { ...mock<User>(), id: '1', tag: '#1', ribbons: 1 };
  const mockUser2 = { ...mock<User>(), id: '2', tag: '#2', ribbons: 2 };
  const mockUser3 = { ...mock<User>(), id: '3', tag: '#3', ribbons: 3 };

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { userId: '1', tag: '#1', ribbons: 1 },
        { userId: '2', tag: '#2', ribbons: 2 },
        { userId: '3', tag: '#3', ribbons: 3 },
      ],
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
  });

  test('returns in right order', async () => {
    const res = await userProvider.getTopRibbonsForUsers([
      mockUser1 as any,
      mockUser2,
      mockUser3,
    ]);
    expect(res).toEqual([
      { tag: '#3', ribbons: 3 },
      { tag: '#2', ribbons: 2 },
      { tag: '#1', ribbons: 1 },
    ]);
  });
});
