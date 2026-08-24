export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Daily Expenses & Voucher Management REST API',
    version: '1.0.0',
    description: 'توثيق REST API لنظام إدارة المصروفات اليومية وسندات الصرف مع تطبيق Android مستقبلي',
  },
  servers: [
    {
      url: 'http://localhost:4000/api/v1',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/auth/login': {
      post: {
        summary: 'تسجيل الدخول',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'AdminPass123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'تم تسجيل الدخول بنجاح' },
        },
      },
    },
    '/expense-journals': {
      get: {
        summary: 'جلب قائمة اليوميات اليومية',
        responses: { 200: { description: 'قائمة اليوميات' } },
      },
      post: {
        summary: 'فتح يومية جديدة',
        responses: { 201: { description: 'تم فتح اليومية' } },
      },
    },
    '/expense-transactions': {
      get: {
        summary: 'جلب قائمة عمليات المصروفات',
        responses: { 200: { description: 'قائمة العمليات' } },
      },
      post: {
        summary: 'إنشاء عملية مصروف / سند صرف',
        responses: { 201: { description: 'تم تسجيل العملية بنجاح' } },
      },
    },
    '/expense-transactions/bulk-assign-project': {
      patch: {
        summary: 'الربط الجماعي للمصروفات بمشروع معين',
        responses: { 200: { description: 'تم الربط الجماعي بنجاح' } },
      },
    },
    '/system-settings/expenses.project_requirement_mode': {
      patch: {
        summary: 'تغيير وضع إلزامية المشروع (OPTIONAL, REQUIRED_ON_APPROVAL, REQUIRED_ON_CREATE)',
        responses: { 200: { description: 'تم التغيير بنجاح' } },
      },
    },
  },
};
