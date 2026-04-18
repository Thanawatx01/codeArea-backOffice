/**
 * OpenAPI 3 รวมทุก endpoint ที่ mount ภายใต้ /api
 * แก้ไขเฉพาะไฟล์นี้เมื่อเพิ่ม/เปลี่ยน route
 */

/** Security requirement มาตรฐาน OpenAPI (array ของ security scheme) */
const bearer = [{ bearerAuth: [] }];

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'CodeArea Back Office API',
    version: '1.0.0',
    description:
      'REST API ภายใต้ prefix `/api` — ใช้ Swagger UI ที่ `/api-docs`',
  },
  servers: [{ url: '/api', description: 'API base (ต่อจาก origin ของเซิร์ฟเวอร์)' }],
  tags: [
    { name: 'Auth', description: 'ลงทะเบียน / เข้าสู่ระบบ / ข้อมูลผู้ใช้จาก token' },
    { name: 'Tags', description: 'แท็กคำถาม' },
    { name: 'QuestionCategories', description: 'หมวดหมู่โจทย์' },
    { name: 'Users', description: 'ผู้ใช้ (back office)' },
    { name: 'Questions', description: 'โจทย์' },
    { name: 'Submissions', description: 'การส่งคำตอบ / รันตัวอย่าง' },
    { name: 'SubmissionTestCases', description: 'ผลรายเทสต์เคสต่อ submission' },
    { name: 'UserActivities', description: 'รายงานพฤติกรรมการส่งคำตอบของผู้ใช้' },
    { name: 'TestCases', description: 'เทสต์เคสของโจทย์ (input/output มาตรฐาน)' },
    { name: 'Leaderboard', description: 'อันดับคะแนนสะสม (point_logs) สูงสุด 100 อันดับ' },
    { name: 'Dashboard', description: 'ภาพรวมระบบ (admin)' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Authorization: Bearer <access_token>',
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'ลงทะเบียน',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  display_name: { type: 'string' },
                  role_id: { type: 'integer', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'สร้างสำเร็จ + token' },
          '400': { description: 'validation / DB' },
          '409': { description: 'อีเมลซ้ำ' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'เข้าสู่ระบบ',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'token + user' },
          '401': { description: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'ออกจากระบบ (stateless — client ลบ token)',
        security: [],
        responses: { '204': { description: 'No content' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'ข้อมูลผู้ใช้จาก JWT',
        security: [],
        responses: {
          '200': { description: '{ user }' },
          '401': { description: 'ไม่มี token / token ไม่ถูกต้อง' },
        },
      },
    },

    '/tags': {
      get: {
        tags: ['Tags'],
        summary: 'รายการแท็ก',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'name', in: 'query', schema: { type: 'string' }, description: 'ค้นหาแบบ ilike' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['true', 'false', '0', '1'] } },
        ],
        responses: { '200': { description: 'data + pagination' } },
      },
      post: {
        tags: ['Tags'],
        summary: 'สร้างแท็ก',
        security: bearer,
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  status: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'สร้างสำเร็จ' }, '400': { description: 'Error' } },
      },
    },
    '/tags/{id}': {
      get: {
        tags: ['Tags'],
        summary: 'ดูแท็กตาม id',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'แท็ก' }, '404': { description: 'ไม่พบ' } },
      },
      put: {
        tags: ['Tags'],
        summary: 'แก้ไขแท็ก',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { name: { type: 'string' }, status: { type: 'boolean' } } },
            },
          },
        },
        responses: { '200': { description: 'OK' }, '400': { description: 'Error' } },
      },
      delete: {
        tags: ['Tags'],
        summary: 'ลบแท็ก',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'ลบสำเร็จ' }, '404': { description: 'ไม่พบ' } },
      },
    },
    '/tags/{id}/restore': {
      put: {
        tags: ['Tags'],
        summary: 'กู้คืนแท็ก (status = true)',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'ไม่พบ' } },
      },
    },

    '/question-categories/list': {
      get: {
        tags: ['QuestionCategories'],
        summary: 'รายการหมวดหมู่ (ไม่ต้องล็อกอิน)',
        security: [],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'name', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'data + pagination + used_categories_count' } },
      },
    },
    '/question-categories/search': {
      post: {
        tags: ['QuestionCategories'],
        summary: 'ค้นหา/รายการหมวดหมู่ (implementation เทียบเท่า list + query)',
        security: bearer,
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'name', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'เหมือน GET /list' } },
      },
    },
    '/question-categories/report': {
      get: {
        tags: ['QuestionCategories'],
        summary: 'Report Question Category Activity',
        description:
          'รายงานตามหมวดหมู่: category, total_unfinished, total_finished, total_attempt',
        security: bearer,
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'name', in: 'query', schema: { type: 'string' }, description: 'ค้นหาชื่อหมวดหมู่' },
          {
            name: 'start_date',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'วันเวลาเริ่มต้น (รองรับ startDate)',
          },
          {
            name: 'end_date',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'วันเวลาสิ้นสุด (รองรับ endDate)',
          },
        ],
        responses: {
          '200': { description: 'filters + data[] + pagination' },
          '400': { description: 'DB error' },
          '401': { description: 'unauthorized' },
        },
      },
    },
    '/question-categories/create': {
      post: {
        tags: ['QuestionCategories'],
        summary: 'สร้างหมวดหมู่',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'สร้างสำเร็จ' }, '400': { description: 'Error' } },
      },
    },
    '/question-categories/update/{id}': {
      patch: {
        tags: ['QuestionCategories'],
        summary: 'อัปเดตหมวดหมู่',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } },
            },
          },
        },
        responses: { '200': { description: 'OK' }, '404': { description: 'ไม่พบ' } },
      },
    },
    '/question-categories/delete/{id}': {
      delete: {
        tags: ['QuestionCategories'],
        summary: 'ลบหมวดหมู่ (soft delete)',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'ไม่พบ' } },
      },
    },
    '/question-categories/restore/{id}': {
      patch: {
        tags: ['QuestionCategories'],
        summary: 'กู้คืนหมวดหมู่',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'ไม่พบ' } },
      },
    },
    '/question-categories/{id}': {
      get: {
        tags: ['QuestionCategories'],
        summary: 'ดูหมวดหมู่ตาม id',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'ไม่พบ' } },
      },
    },

    '/users': {
      get: {
        tags: ['Users'],
        summary: 'รายการผู้ใช้',
        security: bearer,
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'data + pagination' } },
      },
      post: {
        tags: ['Users'],
        summary: 'สร้างผู้ใช้',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'display_name', 'password'],
                properties: {
                  email: { type: 'string' },
                  display_name: { type: 'string' },
                  password: { type: 'string' },
                  role: { type: 'integer', default: 1 },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'ผู้ใช้ใหม่' }, '400': { description: 'Error' } },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'ดูผู้ใช้',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'user' }, '404': { description: 'ไม่พบ' } },
      },
      put: {
        tags: ['Users'],
        summary: 'แก้ไขผู้ใช้',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { display_name: { type: 'string' }, role: { type: 'integer' } } },
            },
          },
        },
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['Users'],
        summary: 'ลบผู้ใช้ (soft)',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },

    '/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'ภาพรวมระบบ',
        description:
          'คืนค่าเป็น object เดียว: จำนวนเทสต์เคส, admin, โจทย์, user, กราฟเปรียบเทียบ submission สำเร็จ/ไม่สำเร็จ, 5 ผู้ใช้ที่มีการส่งล่าสุด (ตามเวลา submission ล่าสุดต่อคน), โจทย์ยอดนิยม 5 ข้อ — ต้องเป็น admin (role_id = 2)',
        security: bearer,
        responses: {
          '200': {
            description:
              'test_cases_total, admins_total, questions_total, users_total, completion_comparison { labels, values, successful_submissions, unsuccessful_submissions }, recent_user_activity[] (5 คนล่าสุดตาม last_submission_at: user_id, display_name, email, last_submission_at, total_attempt, total_unfinished, total_finished, submissions_passed, submissions_not_passed, avg_submit_per_question, submissions_by_day[] { date, count }), top_questions[]',
          },
          '403': { description: 'ไม่ใช่ admin' },
          '500': { description: 'Server error' },
        },
      },
    },

    '/user-activities': {
      get: {
        tags: ['UserActivities'],
        summary: 'Report User Activity',
        description:
          'ตารางกิจกรรมผู้ใช้: display_name, total_attempt, total_unfinished, total_finished, avg_submit_per_question',
        security: bearer,
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'ค้นหาจาก display_name หรือ email',
          },
          {
            name: 'start_date',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'วันเวลาเริ่มต้นของช่วงข้อมูล (รองรับ startDate ด้วย)',
          },
          {
            name: 'end_date',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'วันเวลาสิ้นสุดของช่วงข้อมูล (รองรับ endDate ด้วย)',
          },
        ],
        responses: {
          '200': {
            description:
              'filters + data[] + pagination; data แต่ละแถวมี user_id, display_name, email, total_attempt, total_unfinished, total_finished, avg_submit_per_question',
          },
          '400': { description: 'DB error' },
          '401': { description: 'unauthorized' },
        },
      },
    },

    '/questions': {
      get: {
        tags: ['Questions'],
        summary: 'รายการโจทย์',
        security: bearer,
        parameters: [
          { name: 'category_id', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'difficulty', in: 'query', schema: { type: 'string' } },
          { name: 'tag', in: 'query', schema: { type: 'array', items: { type: 'string' } }, style: 'form', explode: true },
          { name: 'status', in: 'query', schema: { type: 'string', default: '1' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          '200': {
            description:
              'data + pagination; แต่ละแถวมี user_progress ของผู้ล็อกอิน (submission ล่าสุดต่อโจทย์): score_percent จากเทสต์ซ่อน, tests_passed/total, submission_id, submission_status — ไม่เคยส่งเป็น null',
          },
        },
      },
      post: {
        tags: ['Questions'],
        summary: 'สร้างโจทย์ (PDF ผ่าน uri เป็น base64 หรือ data URL)',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['category_id', 'title', 'uri'],
                properties: {
                  category_id: { type: 'integer' },
                  title: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  constraints: { type: 'string', nullable: true },
                  solution: { type: 'string', nullable: true },
                  uri: { type: 'string', description: 'ไฟล์ PDF หรือ base64 PDF' },
                  difficulty: { type: 'string', nullable: true },
                  expected_complexity: { type: 'string', nullable: true },
                  time_limit: { type: 'number', nullable: true },
                  memory_limit: { type: 'number', nullable: true },
                  points: { type: 'number', nullable: true },
                  status: { type: 'boolean', default: true },
                  tag: { type: 'array', items: {} },
                  test_cases: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        input_data: { type: 'string' },
                        output_data: { type: 'string' },
                        case_order: { type: 'integer' },
                        is_simple: { type: 'boolean' },
                        status: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'question_id + code' }, '400': { description: 'validation' } },
      },
    },
    '/questions/{code}': {
      get: {
        tags: ['Questions'],
        summary: 'ดูโจทย์ตามรหัส (รวม test_cases)',
        security: bearer,
        parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string', example: 'QT00001' } }],
        responses: {
          '200': {
            description:
              'รายละเอียดโจทย์ + test_cases + user_progress (เหมือนรายการโจทย์)',
          },
          '400': { description: 'DB error' },
        },
      },
      put: {
        tags: ['Questions'],
        summary: 'แก้ไขโจทย์',
        security: bearer,
        parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', description: 'ฟิลด์เดียวกับ create (ตามที่ controller รองรับ)' },
            },
          },
        },
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['Questions'],
        summary: 'ลบโจทย์',
        security: bearer,
        parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },

    '/test-cases': {
      get: {
        tags: ['TestCases'],
        summary: 'รายการ test cases ของโจทย์',
        description: 'ส่ง question_code (หรือ code) เป็น query — คืนเฉพาะเทสต์ที่ status เปิด และโจทย์ต้องเปิดใช้งาน',
        security: bearer,
        parameters: [
          { name: 'question_code', in: 'query', required: true, schema: { type: 'string', example: 'QT00001' } },
          { name: 'code', in: 'query', schema: { type: 'string' }, description: 'alias ของ question_code' },
        ],
        responses: {
          '200': {
            description: 'question_code, question_id, data[] (id, input_data, output_data, case_order, is_simple, status, created_at)',
          },
          '400': { description: 'ไม่ส่ง question_code/code' },
          '404': { description: 'ไม่พบโจทย์ / โจทย์ปิด' },
        },
      },
    },
    '/test-cases/{id}': {
      get: {
        tags: ['TestCases'],
        summary: 'ดู test case ตาม id',
        description: 'PK ของ test_cases — คืนเมื่อทั้ง test case และโจทย์เปิดใช้งาน (status)',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'ฟิลด์ test case + question_code' },
          '404': { description: 'ไม่พบ' },
        },
      },
    },

    '/leaderboard': {
      get: {
        tags: ['Leaderboard'],
        summary: 'Leaderboard 100 อันดับแรก',
        description:
          'podium = อันดับ 1–3 (บันไดหัว); table = อันดับ 4–100 แบ่งหน้า (page, limit สูงสุด 97 ต่อหน้า); คะแนนจาก MAX(total_point) ใน point_logs ต่อ user',
        security: bearer,
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'หน้าของตารางอันดับ 4–100' },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 97, default: 20 } },
        ],
        responses: {
          '200': {
            description: 'podium[], table.data[], table.pagination, meta',
          },
          '400': { description: 'DB / RPC' },
        },
      },
    },

    '/submissions': {
      get: {
        tags: ['Submissions'],
        summary: 'รายการ submission ของผู้ใช้ที่ล็อกอิน',
        security: bearer,
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          {
            name: 'question_code',
            in: 'query',
            schema: { type: 'string' },
            description: 'กรองตามรหัสโจทย์ (เช่น QT00001)',
          },
          { name: 'code', in: 'query', schema: { type: 'string' }, description: 'alias ของ question_code' },
        ],
        responses: {
          '200': {
            description:
              'io_meta; แต่ละแถวมี answer (ซอร์สที่ส่ง — ฟิลด์เดียวกับ body.code ตอน POST), score_percent, test_summary, submission_test_cases (enrich)',
          },
          '404': { description: 'ไม่พบโจทย์เมื่อส่ง question_code/code' },
        },
      },
      post: {
        tags: ['Submissions'],
        summary: 'ส่งคำตอบตรวจเทสเคสซ่อน',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['question_code', 'language', 'code'],
                properties: {
                  question_code: { type: 'string', description: 'รหัสโจทย์ (ฟิลด์ code ใน body คือซอร์สโปรแกรม)' },
                  language: { type: 'string', example: 'python' },
                  code: { type: 'string', description: 'ซอร์สโปรแกรม' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description:
              'id, pid, score_percent, submission_test_cases[] (input_data, expected_output, actual_output, status, run_time, memory_used ต่อเทสต์ซ่อน), test_summary (tests_* ไม่รวมเปอร์เซ็นต์; run_time/memory ระดับ submission = เฉลี่ยต่อเทสต์ซ่อน), hidden_tests_run',
          },
          '404': { description: 'ไม่พบโจทย์' },
        },
      },
    },
    '/submissions/sample-run': {
      post: {
        tags: ['Submissions'],
        summary: 'รันเทสเคสแบบ sample (is_simple)',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['question_code', 'language', 'code'],
                properties: {
                  question_code: { type: 'string' },
                  language: { type: 'string' },
                  code: { type: 'string', description: 'ซอร์สโปรแกรม' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description:
              'score_percent ระดับบนสุด; summary (tests_*, avg_run_time_ms, avg_memory_used_bytes, คำอธิบายว่าค่าต่อเทสต์ vs ค่าเฉลี่ย); results[] มี input/expected/actual, run_time และ memory_used ต่อเทสต์',
          },
        },
      },
    },
    '/submissions/{pid}': {
      get: {
        tags: ['Submissions'],
        summary: 'ดู submission ตาม pid',
        description:
          'path `pid` = submissions.pid (ไมโครวินาทีจาก epoch ที่ generate ตอน POST ส่งข้อ); test_summary + submission_test_cases (enrich แล้ว) + io_meta',
        security: bearer,
        parameters: [{ name: 'pid', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'submission + score_percent + test_summary + io_meta + submission_test_cases' },
          '404': { description: 'ไม่พบ' },
        },
      },
    },

    '/submission-test-cases': {
      get: {
        tags: ['SubmissionTestCases'],
        summary: 'รายการผลเทสต์เคส',
        description:
          'ส่ง submissionId **หรือ** question_code / code (ใช้ submission ล่าสุดของผู้ใช้สำหรับโจทย์นั้น)',
        security: bearer,
        parameters: [
          { name: 'submissionId', in: 'query', schema: { type: 'integer' } },
          { name: 'question_code', in: 'query', schema: { type: 'string' } },
          { name: 'code', in: 'query', schema: { type: 'string' }, description: 'alias ของ question_code' },
        ],
        responses: {
          '200': {
            description:
              'io_meta + score_percent + test_summary (รวมถึงชุดนี้ทั้ง submission; ไม่รวมเปอร์เซ็นต์ใน object) + data[] enrich: passed, input_data, expected_output, actual_output, run_time_ms, memory_used_bytes',
          },
          '400': { description: 'พารามิเตอร์ไม่ครบ' },
          '404': { description: 'ไม่พบ submission / โจทย์' },
        },
      },
    },
    '/submission-test-cases/{id}': {
      get: {
        tags: ['SubmissionTestCases'],
        security: bearer,
        summary: 'ดูผลเทสต์เคสตาม id',
        description:
          'path `id` = submission_test_cases.id (PK); test_summary สำหรับเทสต์เดียว + io_meta + ฟิลด์ enrich',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'รายการเดียว + score_percent + test_summary + io_meta' }, '404': { description: 'ไม่พบ' } },
      },
    },
  },
};
