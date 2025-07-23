const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
const isMatch = (a, b) => normalize(a).includes(normalize(b)) || normalize(b).includes(normalize(a));

const seedStores = async () => {
  console.log('🏪 Seeding stores...');
  const { data } = await axios.get('https://www.cheapshark.com/api/1.0/stores');

  for (const s of data) {
    await prisma.store.upsert({
      where: { storeId: s.storeID.toString() },
      update: {},
      create: {
        storeId: s.storeID.toString(),
        name: s.storeName,
        isActive: s.isActive === 1,
      },
    });
  }

  console.log(`✅ Seeded ${data.length} stores.`);
};

const seedGenres = async () => {
  console.log('🎮 Seeding genres...');
  const { data } = await axios.get('https://api.rawg.io/api/genres', {
    params: { key: process.env.RAWG_API_KEY },
  });

  for (const g of data.results) {
    await prisma.genre.upsert({
      where: { name: g.name },
      update: {},
      create: { name: g.name },
    });
  }

  console.log(`✅ Seeded ${data.results.length} genres.`);
};

const fetchAllDeals = async (maxDeals = 500) => {
  console.log('🌐 Fetching deals...');
  const seenGameIDs = new Set(); // รีเซ็ตทุกครั้งที่รัน
  const deals = [];
  let pageNumber = 0;

  // ลองดึงดีลด้วยพารามิเตอร์ที่แตกต่างกันเพื่อได้ดีลใหม่
  const sortOptions = ['dealRating', 'title', 'savings', 'price']; // เปลี่ยน sort เพื่อดึงดีลใหม่
  for (const sortBy of sortOptions) {
    pageNumber = 0; // รีเซ็ตหน้าใหม่สำหรับแต่ละ sort
    while (deals.length < maxDeals) {
      try {
        const { data } = await axios.get('https://www.cheapshark.com/api/1.0/deals', {
          params: { pageNumber, pageSize: 100, sortBy, upperPrice: 60 }, // จำกัดราคาสูงสุดเพื่อหลีกเลี่ยงดีลเก่า
        });

        if (!data.length) break;

        for (const deal of data) {
          if (!seenGameIDs.has(deal.gameID)) {
            seenGameIDs.add(deal.gameID);
            deals.push(deal);
          }

          if (deals.length >= maxDeals) break;
        }

        pageNumber++;
        await new Promise((res) => setTimeout(res, 2000)); // รอ 2 วินาที
      } catch (error) {
        console.error(`Error fetching page ${pageNumber} with sort ${sortBy}:`, error.message);
        await new Promise((res) => setTimeout(res, 5000)); // Retry หลังจาก 5 วินาที
      }
    }
    if (deals.length >= maxDeals) break;
  }

  console.log(`✅ Fetched ${deals.length} deals.`);
  return deals;
};

const seedGames = async (dealTitles) => {
  console.log('🕹️ Seeding games...');
  const allGames = new Map();
  const seen = new Set();
  const normalizedTitles = dealTitles.map(normalize);

  const fetchAndInsert = async (game) => {
    const inserted = await prisma.game.upsert({
      where: { rawgId: game.id },
      update: {},
      create: {
        rawgId: game.id,
        name: game.name,
        slug: game.slug,
        description: game.description_raw || null,
        metacritic: game.metacritic || null,
        website: game.website || null,
        esrb: game.esrb_rating?.name || null,
        backgroundImage: game.background_image,
        released: game.released ? new Date(game.released) : null,
        rating: game.rating || null,
      },
    });

    for (const genre of game.genres || []) {
      const genreRecord = await prisma.genre.findUnique({ where: { name: genre.name } });
      if (genreRecord) {
        await prisma.gameGenre.upsert({
          where: { gameId_genreId: { gameId: inserted.id, genreId: genreRecord.id } },
          update: {},
          create: { gameId: inserted.id, genreId: genreRecord.id },
        });
      }
    }

    if (game.tags && game.tags.length > 0) {
      for (const tag of game.tags) {
        try {
          const tagSlug = tag.slug || normalize(tag.name);
          const tagRecord = await prisma.tag.upsert({
            where: { slug: tagSlug },
            update: { name: tag.name },
            create: { name: tag.name, slug: tagSlug },
          });

          await prisma.gameTag.upsert({
            where: { gameId_tagId: { gameId: inserted.id, tagId: tagRecord.id } },
            update: {},
            create: { gameId: inserted.id, tagId: tagRecord.id },
          });
        } catch (err) {
          console.error(`Failed to insert tag ${tag.name}:`, err);
        }
      }
    }

    if (game.platforms && game.platforms.length > 0) {
      for (const platform of game.platforms) {
        try {
          const platformData = platform.platform;
          const platformSlug = platformData.slug || normalize(platformData.name);
          const platformRecord = await prisma.platform.upsert({
            where: { slug: platformSlug },
            update: { name: platformData.name },
            create: { name: platformData.name, slug: platformSlug },
          });

          await prisma.gamePlatform.upsert({
            where: { gameId_platformId: { gameId: inserted.id, platformId: platformRecord.id } },
            update: {},
            create: { gameId: inserted.id, platformId: platformRecord.id },
          });
        } catch (err) {
          console.error(`Failed to insert platform ${platform.platform?.name}:`, err);
        }
      }
    }

    if (game.ratings && game.ratings.length > 0) {
      for (const rating of game.ratings) {
        try {
          await prisma.rating.upsert({
            where: { gameId_title: { gameId: inserted.id, title: rating.title } },
            update: { count: rating.count, percent: rating.percent },
            create: {
              gameId: inserted.id,
              title: rating.title,
              count: rating.count,
              percent: rating.percent,
            },
          });
        } catch (err) {
          console.error(`Failed to insert rating ${rating.title} for game ${inserted.name}:`, err);
        }
      }
    }

    if (game.short_screenshots && Array.isArray(game.short_screenshots) && game.short_screenshots.length > 0) {
      for (const shot of game.short_screenshots) {
        try {
          await prisma.screenshot.upsert({
            where: { gameId_url: { gameId: inserted.id, url: shot.image } },
            update: {},
            create: { gameId: inserted.id, url: shot.image },
          });
        } catch (err) {
          console.error(`Failed to insert screenshot ${shot.image} for game ${inserted.name}:`, err);
        }
      }
    }

    allGames.set(inserted.name, inserted);
  };

  for (let page = 1; page <= 50; page++) {
    const { data } = await axios.get('https://api.rawg.io/api/games', {
      params: { key: process.env.RAWG_API_KEY, page, page_size: 40 },
    });

    for (const g of data.results) {
      const nameNorm = normalize(g.name);
      if ((normalizedTitles.includes(nameNorm) && !seen.has(nameNorm)) || allGames.size < 500) {
        await fetchAndInsert(g);
        seen.add(nameNorm);
      }

      if (allGames.size >= 500) break;
    }

    if (allGames.size >= 500) break;
  }

  console.log(`✅ Seeded ${allGames.size} games.`);
  return [...allGames.values()];
};

const seedDeals = async (games, deals) => {
  console.log('💸 Seeding deals...');
  const dealRecords = [];

  for (const deal of deals) {
    const matched = games.find(g => isMatch(g.name, deal.title));
    if (!matched) {
      console.warn(`No match found for deal title: ${deal.title}`);
      continue;
    }

    dealRecords.push({
      dealId: deal.dealID,
      gameId: matched.id,
      storeId: parseInt(deal.storeID),
      salePrice: parseFloat(deal.salePrice),
      normalPrice: parseFloat(deal.normalPrice),
      savings: parseFloat(deal.savings),
      dealRating: parseFloat(deal.dealRating),
    });
  }

  const result = await prisma.deal.createMany({
    data: dealRecords,
    skipDuplicates: true,
  });

  console.log(`✅ Inserted ${result.count} deals.`);
};

const runSeed = async () => {
  try {
    await seedStores();
    await seedGenres();
    const deals = await fetchAllDeals(500);
    const games = await seedGames(deals.map(d => d.title));
    await seedDeals(games, deals);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await prisma.$disconnect();
  }
};

runSeed();