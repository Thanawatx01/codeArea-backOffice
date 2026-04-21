const { supabaseAdmin } = require('../config/supabase');

const MAX_LEADERBOARD = 100;
const PODIUM_END = 3;
const TABLE_START_RANK = 4;

/**
 * GET /leaderboard
 * podium: อันดับ 1–3 (บันไดหัวตาราง)
 * table: อันดับ 4–100 แบบแบ่งหน้า (query: page, limit)
 */
const get = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 97);

    const { data: rows, error } = await supabaseAdmin.rpc('leaderboard_top_100');
    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }

    const list = Array.isArray(rows) ? rows : [];
    const mapRow = (r) => ({
      rank: Number(r.rank),
      user_id: r.user_id,
      display_name: r.display_name ?? null,
      email: r.email ?? null,
      avatar_url: r.avatar_url ?? null,
      total_point: r.total_point,
      solved_count: Number(r.solved_count),
    });

    const podium = list.filter((r) => Number(r.rank) <= PODIUM_END).map(mapRow);
    const rest = list.filter((r) => Number(r.rank) >= TABLE_START_RANK && Number(r.rank) <= MAX_LEADERBOARD);

    const total = rest.length;
    const fromIndex = (page - 1) * limit;
    const tableData = rest.slice(fromIndex, fromIndex + limit).map(mapRow);
    const total_pages = Math.ceil(total / limit) || 0;

    return res.status(200).json({
      podium,
      table: {
        data: tableData,
        pagination: {
          page,
          limit,
          total,
          total_pages,
        },
      },
      meta: {
        leaderboard_cap: MAX_LEADERBOARD,
        podium_ranks: `1–${PODIUM_END}`,
        table_ranks: `${TABLE_START_RANK}–${MAX_LEADERBOARD}`,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

module.exports = { get };
