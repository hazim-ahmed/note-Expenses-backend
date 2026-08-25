export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Daily Expenses Journal REST API',
    version: '1.1.0',
    description: 'توثيق REST API الفعلي لدفتر يوميات المصروفات اليومية: فتح تلقائي، تسجيل مصروفات، مراجعة يومية، وطرق دفع كاش/بنك.',
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
    schemas: {
      ApiSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'تمت العملية بنجاح' },
          data: { type: 'object' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'خطأ في التحقق من البيانات المدخلة' },
          errorCode: { type: 'string', example: 'VALIDATION_ERROR' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'paymentMethodId' },
                message: { type: 'string', example: 'طريقة الدفع مطلوبة' },
              },
            },
          },
        },
      },
      TodayTransactionCreateRequest: {
        type: 'object',
        required: ['categoryId', 'paymentMethodId', 'amount', 'description'],
        properties: {
          manualVoucherNumber: { type: 'string', nullable: true, example: '125' },
          beneficiaryId: { type: 'integer', nullable: true, example: 1 },
          beneficiaryName: { type: 'string', nullable: true, example: 'مؤسسة المثال للمقاولات' },
          categoryId: { type: 'integer', example: 1 },
          projectId: { type: 'integer', nullable: true, example: 3 },
          projectUnitId: { type: 'integer', nullable: true, example: null },
          paymentMethodId: { type: 'integer', example: 1, description: 'طريقة الدفع المختارة من GET /payment-methods' },
          paymentReference: { type: 'string', nullable: true, example: 'TRX-993100', description: 'مطلوب إذا كانت طريقة الدفع requiresReference=true مثل التحويل البنكي' },
          amount: { type: 'number', format: 'decimal', example: 250.75 },
          description: { type: 'string', example: 'شراء مواد تنظيف لموقع المشروع' },
          invoiceNumber: { type: 'string', nullable: true, example: 'INV-9912' },
          invoiceDate: { type: 'string', nullable: true, example: '2026-08-25' },
          invoiceAmount: { type: 'number', nullable: true, example: 250.75 },
          notes: { type: 'string', nullable: true, example: 'تم الصرف بشكل عاجل بناء على طلب مشرف الموقع' },
        },
        anyOf: [
          { required: ['beneficiaryId'] },
          { required: ['beneficiaryName'] },
        ],
      },
      TodayTransactionUpdateRequest: {
        type: 'object',
        properties: {
          manualVoucherNumber: { type: 'string', nullable: true, example: '126' },
          beneficiaryId: { type: 'integer', example: 1 },
          categoryId: { type: 'integer', example: 2 },
          projectId: { type: 'integer', nullable: true, example: null },
          projectUnitId: { type: 'integer', nullable: true, example: null },
          paymentMethodId: { type: 'integer', example: 2 },
          paymentReference: { type: 'string', nullable: true, example: 'BANK-REF-20260825' },
          amount: { type: 'number', format: 'decimal', example: 300 },
          description: { type: 'string', example: 'تعديل بيان المصروف' },
          invoiceNumber: { type: 'string', nullable: true, example: null },
          invoiceDate: { type: 'string', nullable: true, example: null },
          invoiceAmount: { type: 'number', nullable: true, example: null },
          notes: { type: 'string', nullable: true, example: 'تعديل قبل توثيق اليومية' },
        },
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
        security: [],
        summary: 'تسجيل الدخول',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
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
          401: { description: 'بيانات الدخول غير صحيحة' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'بيانات المستخدم الحالي',
        tags: ['Auth'],
        responses: {
          200: { description: 'بيانات المستخدم الحالي' },
        },
      },
    },
    '/today': {
      get: {
        summary: 'جلب أو فتح يومية اليوم تلقائياً',
        tags: ['Today Journal'],
        description: 'يفتح النظام يومية اليوم حسب توقيت الرياض إذا لم تكن موجودة، ويعيد رقم اليومية وحالتها والإجمالي.',
        responses: {
          200: { description: 'بيانات يومية اليوم' },
        },
      },
    },
    '/today/transactions': {
      get: {
        summary: 'قائمة مصروفات يومية اليوم',
        tags: ['Today Journal'],
        responses: {
          200: { description: 'قائمة سندات اليوم مع المستفيد والتصنيف والمشروع وطريقة الدفع' },
        },
      },
      post: {
        summary: 'تسجيل مصروف في يومية اليوم',
        tags: ['Today Journal'],
        description: 'لا يرسل الفرونت journalId أو voucherDate؛ الباك يحدد اليومية والتاريخ تلقائياً. طريقة الدفع إلزامية، ومرجع الدفع إلزامي إذا كانت طريقة الدفع تتطلب مرجعاً.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TodayTransactionCreateRequest' },
            },
          },
        },
        responses: {
          201: { description: 'تم تسجيل المصروف' },
          400: { description: 'خطأ تحقق أو بيانات غير مكتملة', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/today/transactions/{id}': {
      patch: {
        summary: 'تعديل مصروف قبل توثيق/قفل اليومية',
        tags: ['Today Journal'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TodayTransactionUpdateRequest' },
            },
          },
        },
        responses: {
          200: { description: 'تم تعديل المصروف' },
          400: { description: 'خطأ تحقق' },
          403: { description: 'اليومية مغلقة' },
          404: { description: 'المصروف غير موجود' },
        },
      },
      delete: {
        summary: 'إلغاء/حذف مصروف من يومية اليوم',
        tags: ['Today Journal'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'تم إلغاء المصروف' },
          403: { description: 'اليومية مغلقة' },
          404: { description: 'المصروف غير موجود' },
        },
      },
    },
    '/journals': {
      get: {
        summary: 'أرشيف اليوميات',
        tags: ['Journals'],
        responses: {
          200: { description: 'قائمة اليوميات مع الإجماليات' },
        },
      },
    },
    '/journals/{id}': {
      get: {
        summary: 'تفاصيل يومية محددة',
        tags: ['Journals'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'بيانات اليومية وسنداتها' },
          404: { description: 'اليومية غير موجودة' },
        },
      },
    },
    '/journals/{id}/close': {
      post: {
        summary: 'إغلاق يومية',
        tags: ['Journals'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'تم إغلاق اليومية' },
        },
      },
    },
    '/journals/{id}/reopen': {
      post: {
        summary: 'إعادة فتح يومية مغلقة',
        tags: ['Journals'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'تم إعادة فتح اليومية' },
        },
      },
    },
    '/payment-methods': {
      get: {
        summary: 'طرق الدفع المتاحة',
        tags: ['Master Data'],
        description: 'يستخدمها الفرونت لاختيار كاش/بنك. إذا كانت requiresReference=true يجب إرسال paymentReference عند حفظ المصروف.',
        responses: {
          200: { description: 'قائمة طرق الدفع' },
        },
      },
    },
    '/expense-categories': {
      get: {
        summary: 'تصنيفات المصروفات',
        tags: ['Master Data'],
        responses: {
          200: { description: 'قائمة التصنيفات' },
        },
      },
    },
    '/beneficiaries': {
      get: {
        summary: 'قائمة المستفيدين',
        tags: ['Master Data'],
        responses: {
          200: { description: 'قائمة المستفيدين' },
        },
      },
      post: {
        summary: 'إضافة مستفيد',
        tags: ['Master Data'],
        responses: {
          201: { description: 'تمت إضافة المستفيد' },
        },
      },
    },
    '/projects': {
      get: {
        summary: 'قائمة المشاريع',
        tags: ['Projects'],
        parameters: [
          { name: 'activeOnly', in: 'query', required: false, schema: { type: 'boolean' } },
          { name: 'status', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'search', in: 'query', required: false, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'قائمة المشاريع' },
        },
      },
    },
    '/expense-transactions/bulk-assign-project': {
      patch: {
        summary: 'ربط جماعي لمصروفات بمشروع',
        tags: ['Bulk Operations'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['transactionIds', 'projectId', 'reason'],
                properties: {
                  transactionIds: { type: 'array', items: { type: 'integer' }, example: [1, 2, 3] },
                  projectId: { type: 'integer', example: 5 },
                  projectUnitId: { type: 'integer', nullable: true, example: null },
                  reason: { type: 'string', example: 'تصحيح ربط السندات بالمشروع بعد مراجعة المحاسب' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'تم الربط الجماعي' },
          400: { description: 'بيانات غير صحيحة' },
        },
      },
    },
  },
};
