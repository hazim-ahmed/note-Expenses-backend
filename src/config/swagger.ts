export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Daily Expenses & Voucher Management REST API',
    version: '1.0.0',
    description: `### توثيق شامل لنظام إدارة المصروفات اليومية وسندات الصرف
توثيق كامل لكافة واجهات برمجة التطبيقات (RESTful API) الخاصة بالنظام المالي، إدارة اليوميات التلقائية، المصروفات، المشاريع، المستفيدين، المستخدمين والصلاحيات (RBAC)، وإعدادات النظام والتقارير.

#### المصادقة (Authentication)
تعتمد جميع المسارات المحمية على توكن **JWT Bearer Token** في الترويسة:
\`Authorization: Bearer <ACCESS_TOKEN>\`
`,
    contact: {
      name: 'Engineering Team',
      email: 'dev@note-expenses.local',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000/api/v1',
      description: 'خادم التطوير المحلي (Local Development Server)',
    },
    {
      url: '/api/v1',
      description: 'الخادم الحالي (Current Origin)',
    },
  ],
  tags: [
    { name: '1. المصادقة والملف الشخصي (Auth & Profile)', description: 'تسجيل الدخول، تجديد الجلسات، جلب وتحديث الملف الشخصي وتعديل اسم المستخدم' },
    { name: '2. يومية ومصروفات اليوم (Today Auto Journal & Transactions)', description: 'اليومية التلقائية الحالية، إضافة وتعديل وحذف مصروفات اليوم' },
    { name: '3. دفاتر اليوميات (Expense Journals)', description: 'استعراض اليوميات السابقة، إغلاق اليومية، وإعادة فتح اليوميات' },
    { name: '4. العمليات وسندات الصرف (Expense Transactions)', description: 'عمليات الربط الجماعي بالمشاريع وإدارة السندات' },
    { name: '5. المشاريع والوحدات العقارية (Projects & Units)', description: 'إدارة المشاريع، الملخص المالي، الحالات، والوحدات العقارية التابعة' },
    { name: '6. المستخدمين والصلاحيات (Users & RBAC)', description: 'إدارة حسابات المستخدمين، تعديل أسماء المستخدمين، الأدوار، الصناديق، والمشاريع' },
    { name: '7. المستفيدين (Beneficiaries)', description: 'إدارة الموردين، المقاولين، والموظفين المستفيدين من الصرف' },
    { name: '8. تصنيفات المصروفات (Expense Categories)', description: 'شجرة تصنيفات وبنود المصروفات وحساباتها' },
    { name: '9. الصناديق والعهد (Cashboxes)', description: 'إدارة الصناديق النقدية وعهدة الصرافين' },
    { name: '10. طرق الدفع (Payment Methods)', description: 'طرق الدفع المعرفة في النظام (نقدي، تحويل، شيك، بطاقة)' },
    { name: '11. إعدادات النظام (System Settings)', description: 'سياسات وقواعد النظام مثل إلزامية ربط المشاريع' },
    { name: '12. التقارير المالية والرقابية (Financial Reports)', description: 'تقارير المصروفات حسب اليوم، المشروع، المستفيد، التصنيف، والسندات اليدوية' },
    { name: '13. سجل التدقيق والرقابة (Audit Logs)', description: 'تتبع كافة التعديلات والتغييرات وحركات النظام المالية والإدارية' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'أدخل توكن JWT بصيغة: Bearer <token>',
      },
    },
    schemas: {
      StandardResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'تم تنفيذ العملية بنجاح' },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'رسالة الخطأ التوضيحية' },
          errorCode: { type: 'string', example: 'VALIDATION_ERROR' },
          details: { type: 'array', items: { type: 'object' } },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          username: { type: 'string', example: 'ahmed.accountant' },
          fullName: { type: 'string', example: 'أحمد محمود العتيبي' },
          employeeNumber: { type: 'string', example: 'EMP-1004' },
          email: { type: 'string', example: 'ahmed@company.com' },
          phone: { type: 'string', example: '+966500000001' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], example: 'ACTIVE' },
          isActive: { type: 'boolean', example: true },
          roles: { type: 'array', items: { type: 'string' }, example: ['ACCOUNTANT'] },
          permissions: { type: 'array', items: { type: 'string' }, example: ['expenses.create', 'expenses.view'] },
        },
      },
      TodayOverview: {
        type: 'object',
        properties: {
          systemDate: { type: 'string', example: '2026-08-24' },
          journalId: { type: 'integer', example: 12 },
          journalNumber: { type: 'string', example: 'JRN-20260824' },
          status: { type: 'string', example: 'OPEN' },
          totalAmount: { type: 'number', example: 1450.50 },
          transactionsCount: { type: 'integer', example: 4 },
        },
      },
      ExpenseTransaction: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 101 },
          journalId: { type: 'integer', example: 12 },
          systemReference: { type: 'string', example: 'TX-20260824-0001' },
          voucherSource: { type: 'string', enum: ['MANUAL', 'ELECTRONIC'], example: 'MANUAL' },
          manualVoucherNumber: { type: 'string', example: 'V-5501' },
          voucherBookNumber: { type: 'string', example: 'BK-10' },
          voucherDate: { type: 'string', example: '2026-08-24' },
          transactionType: { type: 'string', enum: ['PURCHASE', 'PAYMENT', 'PETTY_CASH', 'TRANSFER', 'OTHER'], example: 'PURCHASE' },
          amount: { type: 'number', example: 350.00 },
          description: { type: 'string', example: 'شراء أدوات صيانة ومواد كهربائية' },
          beneficiaryId: { type: 'integer', example: 3 },
          beneficiaryName: { type: 'string', example: 'شركة مواد البناء المحدودة' },
          categoryId: { type: 'integer', example: 5 },
          categoryName: { type: 'string', example: 'مصاريف صيانة وتشغيل' },
          projectId: { type: 'integer', nullable: true, example: 2 },
          projectName: { type: 'string', nullable: true, example: 'مشروع برج الأندلس' },
          projectUnitId: { type: 'integer', nullable: true, example: null },
          paymentMethodId: { type: 'integer', example: 1 },
          paymentMethodName: { type: 'string', example: 'نقدي (Cash)' },
          invoiceStatus: { type: 'string', enum: ['NOT_REQUIRED', 'PENDING', 'PROVIDED'], example: 'PROVIDED' },
          invoiceNumber: { type: 'string', nullable: true, example: 'INV-99812' },
          invoiceDate: { type: 'string', nullable: true, example: '2026-08-24' },
          invoiceAmount: { type: 'number', nullable: true, example: 350.00 },
          status: { type: 'string', example: 'APPROVED' },
          createdAt: { type: 'string', example: '2026-08-24T09:30:00.000Z' },
        },
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 2 },
          projectCode: { type: 'string', example: 'PRJ-2026-01' },
          projectName: { type: 'string', example: 'مشروع برج الأندلس' },
          description: { type: 'string', example: 'أعمال المقاولات والتشطيبات لبرج الأندلس' },
          costCenterCode: { type: 'string', example: 'CC-101' },
          location: { type: 'string', example: 'الرياض - حي الياسمين' },
          status: { type: 'string', enum: ['PLANNED', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'ARCHIVED', 'CANCELLED'], example: 'ACTIVE' },
          estimatedBudget: { type: 'number', example: 500000.00 },
          isActive: { type: 'boolean', example: true },
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
    // ─────────────────────────────────────────
    // 1. Auth & Profile
    // ─────────────────────────────────────────
    '/auth/login': {
      post: {
        tags: ['1. المصادقة والملف الشخصي (Auth & Profile)'],
        summary: 'تسجيل الدخول إلى النظام',
        description: 'التحقق من اسم المستخدم وكلمة المرور والحصول على رموز المصادقة (JWT Access & Refresh Tokens).',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'admin', description: 'اسم المستخدم' },
                  password: { type: 'string', example: 'AdminPass123!', description: 'كلمة المرور' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'تم تسجيل الدخول بنجاح',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'تم تسجيل الدخول بنجاح' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        tokens: {
                          type: 'object',
                          properties: {
                            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                            refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                            expiresIn: { type: 'string', example: '15m' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['1. المصادقة والملف الشخصي (Auth & Profile)'],
        summary: 'تجديد رمز الوصول (Refresh Token)',
        description: 'تجديد Access Token منتهي الصلاحية باستخدام Refresh Token صالح دون الحاجة لتسجيل الدخول من جديد.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'تم تجديد رمز الوصول بنجاح' },
          401: { description: 'رمز التحديث غير صالح أو منتهي الصلاحية' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['1. المصادقة والملف الشخصي (Auth & Profile)'],
        summary: 'جلب بيانات وصلاحيات المستخدم الحالي',
        description: 'إرجاع معلومات الحساب المسجل حالياً بما في ذلك الأدوار والصلاحيات والصناديق والمشاريع المرتبطة.',
        responses: {
          200: {
            description: 'بيانات المستخدم الحالي',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { description: 'غير مصرح - التوكن مفقود أو غير صالح' },
        },
      },
    },
    '/auth/profile': {
      patch: {
        tags: ['1. المصادقة والملف الشخصي (Auth & Profile)'],
        summary: 'تعديل الملف الشخصي واسم المستخدم للحساب الحالي',
        description: 'إمكانية تعديل اسم المستخدم (Username)، الاسم الكامل (FullName)، البريد الإلكتروني، ورقم الهاتف للمستخدم الحالي مباشرة.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', minLength: 3, example: 'new.username', description: 'اسم المستخدم الجديد (يجب أن يكون فريداً)' },
                  fullName: { type: 'string', minLength: 3, example: 'سارة خالد المنصور', description: 'الاسم الكامل' },
                  email: { type: 'string', format: 'email', example: 'sara@company.com', description: 'البريد الإلكتروني' },
                  phone: { type: 'string', example: '+966551234567', description: 'رقم الهاتف' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'تم تحديث بيانات الملف الشخصي واسم المستخدم بنجاح' },
          400: { description: 'اسم المستخدم مستخدم بالفعل أو البيانات غير صالحة' },
          401: { description: 'غير مصرح' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['1. المصادقة والملف الشخصي (Auth & Profile)'],
        summary: 'تسجيل الخروج',
        description: 'إنهاء جلسة المستخدم الحالية.',
        responses: {
          200: { description: 'تم تسجيل الخروج بنجاح' },
        },
      },
    },

    // ─────────────────────────────────────────
    // 2. Today's Auto Journal & Transactions
    // ─────────────────────────────────────────
    '/today': {
      get: {
        tags: ['2. يومية ومصروفات اليوم (Today Auto Journal & Transactions)'],
        summary: 'الحصول على ملخص يومية اليوم التلقائية',
        description: 'جلب بيانات يومية اليوم الحالية تلقائياً (تاريخ النظام بتوقيت الرياض، رقم اليومية، إجمالي المبالغ، عدد العمليات، وحالتها).',
        responses: {
          200: {
            description: 'ملخص يومية اليوم',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/TodayOverview' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/today/transactions': {
      get: {
        tags: ['2. يومية ومصروفات اليوم (Today Auto Journal & Transactions)'],
        summary: 'جلب قائمة مصروفات وسندات اليوم',
        description: 'استرجاع جميع سندات ومصروفات يومية اليوم مع بيانات المستفيد والتصنيف والمشروع وطريقة الدفع.',
        responses: {
          200: {
            description: 'قائمة مصروفات اليوم',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/ExpenseTransaction' } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['2. يومية ومصروفات اليوم (Today Auto Journal & Transactions)'],
        summary: 'إضافة مصروف جديد في يومية اليوم',
        description: 'تسجيل سند صرف ومصروف في يومية اليوم التلقائية مع التحقق من شروط الربط بالمشروع وإلزامية السندات والفواتير.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'description', 'categoryId', 'paymentMethodId'],
                properties: {
                  manualVoucherNumber: { type: 'string', example: '1050', description: 'رقم السند اليدوي' },
                  voucherBookNumber: { type: 'string', example: 'BK-02', description: 'رقم دفتر السندات اليدوية' },
                  voucherSource: { type: 'string', enum: ['MANUAL', 'ELECTRONIC'], default: 'MANUAL' },
                  transactionType: { type: 'string', enum: ['PURCHASE', 'PAYMENT', 'PETTY_CASH', 'TRANSFER', 'OTHER'], default: 'PURCHASE' },
                  amount: { type: 'number', example: 450.00, description: 'المبلغ الإجمالي' },
                  description: { type: 'string', example: 'شراء أدوات صيانة وضيافة للمشروع', description: 'بيان الصرف' },
                  beneficiaryId: { type: 'integer', example: 1, description: 'معرف المستفيد' },
                  beneficiaryName: { type: 'string', example: 'مؤسسة الرياض للتوريدات', description: 'اسم المستفيد (في حال كان جديداً)' },
                  categoryId: { type: 'integer', example: 2, description: 'معرف تصنيف المصروف' },
                  projectId: { type: 'integer', nullable: true, example: 1, description: 'معرف المشروع' },
                  projectUnitId: { type: 'integer', nullable: true, example: null, description: 'معرف الوحدة العقارية التابعة للمشروع' },
                  paymentMethodId: { type: 'integer', example: 1, description: 'طريقة الدفع (1: نقدي، 2: تحويل، ...)' },
                  invoiceStatus: { type: 'string', enum: ['NOT_REQUIRED', 'PENDING', 'PROVIDED'], default: 'NOT_REQUIRED' },
                  invoiceNumber: { type: 'string', nullable: true, example: 'INV-2026-88' },
                  invoiceDate: { type: 'string', format: 'date', nullable: true, example: '2026-08-24' },
                  invoiceAmount: { type: 'number', nullable: true, example: 450.00 },
                  notes: { type: 'string', nullable: true, example: 'ملاحظات إضافية' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'تم إضافة المصروف في يومية اليوم بنجاح' },
          400: { description: 'بيانات غير صالحة أو عدم استيفاء شروط المشروع/الفاتورة' },
        },
      },
    },
    '/today/transactions/{id}': {
      patch: {
        tags: ['2. يومية ومصروفات اليوم (Today Auto Journal & Transactions)'],
        summary: 'تعديل مصروف مسجل في اليومية الحالية',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'معرف العملية (Transaction ID)' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  amount: { type: 'number', example: 500.00 },
                  description: { type: 'string', example: 'تعديل بيان الصرف' },
                  manualVoucherNumber: { type: 'string', example: '1051' },
                  beneficiaryId: { type: 'integer', example: 2 },
                  categoryId: { type: 'integer', example: 3 },
                  projectId: { type: 'integer', nullable: true, example: 1 },
                  invoiceStatus: { type: 'string', enum: ['NOT_REQUIRED', 'PENDING', 'PROVIDED'] },
                  invoiceNumber: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'تم تعديل بيانات المصروف بنجاح' },
          400: { description: 'لا يمكن تعديل عملية في يومية مغلقة أو معتمدة نهائياً' },
          404: { description: 'العملية غير موجودة' },
        },
      },
      delete: {
        tags: ['2. يومية ومصروفات اليوم (Today Auto Journal & Transactions)'],
        summary: 'حذف / إلغاء مصروف من يومية اليوم',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'معرف العملية' },
        ],
        responses: {
          200: { description: 'تم حذف المصروف بنجاح' },
          400: { description: 'لا يمكن حذف عملية في يومية مغلقة' },
          404: { description: 'المصروف غير موجود' },
        },
      },
    },

    // ─────────────────────────────────────────
    // 3. Journals
    // ─────────────────────────────────────────
    '/journals': {
      get: {
        tags: ['3. دفاتر اليوميات (Expense Journals)'],
        summary: 'جلب قائمة دفاتر اليوميات السابقة والحالية',
        responses: {
          200: { description: 'قائمة دفاتر اليوميات' },
        },
      },
    },
    '/journals/{id}': {
      get: {
        tags: ['3. دفاتر اليوميات (Expense Journals)'],
        summary: 'جلب تفاصيل يومية معينة مع كافة سنداتها',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'معرف اليومية' },
        ],
        responses: {
          200: { description: 'تفاصيل اليومية بنجاح' },
          404: { description: 'اليومية غير موجودة' },
        },
      },
    },
    '/journals/{id}/close': {
      post: {
        tags: ['3. دفاتر اليوميات (Expense Journals)'],
        summary: 'إغلاق اليومية اليومية',
        description: 'إغلاق اليومية وتثبيت أرصدتها ومنع إضافة مصروفات جديدة عليها دون إعادة الفتح.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'معرف اليومية' },
        ],
        responses: {
          200: { description: 'تم إغلاق اليومية بنجاح' },
          400: { description: 'اليومية مغلقة بالفعل' },
        },
      },
    },
    '/journals/{id}/reopen': {
      post: {
        tags: ['3. دفاتر اليوميات (Expense Journals)'],
        summary: 'إعادة فتح اليومية المغلقة (مسؤول النظام)',
        description: 'إعادة فتح يومية مغلقة لتعديل القيود مع تسجيل العملية في سجل الرقابة.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'معرف اليومية' },
        ],
        responses: {
          200: { description: 'تم إعادة فتح اليومية بنجاح' },
        },
      },
    },

    // ─────────────────────────────────────────
    // 4. Expense Transactions Bulk Operations
    // ─────────────────────────────────────────
    '/expense-transactions/bulk-assign-project': {
      patch: {
        tags: ['4. العمليات وسندات الصرف (Expense Transactions)'],
        summary: 'الربط الجماعي للسندات غير المرتبطة بمشروع معين',
        description: 'تخصيص مجموعة من السندات غير المربوطة وربطها بمشروع واحد مع ذكر سبب الربط.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['transactionIds', 'projectId', 'reason'],
                properties: {
                  transactionIds: { type: 'array', items: { type: 'integer' }, example: [101, 102, 105], description: 'معرفات العمليات' },
                  projectId: { type: 'integer', example: 2, description: 'معرف المشروع المراد الربط به' },
                  projectUnitId: { type: 'integer', nullable: true, example: null, description: 'الوحدة التابعة للمشروع (اختياري)' },
                  reason: { type: 'string', example: 'تم اعتماد تحميل تكاليف المواد على مشروع الأندلس', description: 'سبب الربط الإجباري' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'تم الربط الجماعي بنجاح' },
          400: { description: 'بيانات غير صالحة أو المشروع معطل' },
        },
      },
    },

    // ─────────────────────────────────────────
    // 5. Projects & Units
    // ─────────────────────────────────────────
    '/projects': {
      get: {
        tags: ['5. المشاريع والوحدات العقارية (Projects & Units)'],
        summary: 'جلب قائمة المشاريع',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'بحث باسم أو كود المشروع' },
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'تصفية حسب الحالة (ACTIVE, SUSPENDED, ...)' },
          { name: 'activeOnly', in: 'query', schema: { type: 'boolean' }, description: 'عرض الفعالة فقط' },
        ],
        responses: {
          200: { description: 'قائمة المشاريع' },
        },
      },
      post: {
        tags: ['5. المشاريع والوحدات العقارية (Projects & Units)'],
        summary: 'إنشاء مشروع جديد',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['projectCode', 'projectName'],
                properties: {
                  projectCode: { type: 'string', example: 'PRJ-2026-05', description: 'كود المشروع الفريد' },
                  projectName: { type: 'string', example: 'مشروع مجمع النرجس', description: 'اسم المشروع' },
                  description: { type: 'string', nullable: true, example: 'إنشاء 10 فلل سكنية' },
                  costCenterCode: { type: 'string', nullable: true, example: 'CC-505' },
                  location: { type: 'string', nullable: true, example: 'الرياض - النرجس' },
                  estimatedBudget: { type: 'number', nullable: true, example: 1200000.00 },
                  status: { type: 'string', enum: ['PLANNED', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'ARCHIVED', 'CANCELLED'], default: 'ACTIVE' },
                  isActive: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'تم إنشاء المشروع بنجاح' },
          400: { description: 'كود المشروع مستخدم بالفعل' },
        },
      },
    },
    '/projects/{id}': {
      get: {
        tags: ['5. المشاريع والوحدات العقارية (Projects & Units)'],
        summary: 'جلب بيانات مشروع محدد',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'بيانات المشروع' },
          404: { description: 'المشروع غير موجود' },
        },
      },
      patch: {
        tags: ['5. المشاريع والوحدات العقارية (Projects & Units)'],
        summary: 'تحديث بيانات المشروع',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  projectName: { type: 'string', example: 'مشروع مجمع النرجس المطور' },
                  estimatedBudget: { type: 'number', example: 1500000.00 },
                  location: { type: 'string', example: 'الرياض - شمال طريق الملك سلمان' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'تم تحديث بيانات المشروع بنجاح' },
        },
      },
    },
    '/projects/{id}/status': {
      patch: {
        tags: ['5. المشاريع والوحدات العقارية (Projects & Units)'],
        summary: 'تحديث حالة المشروع (تفعيل / إيقاف / إكمال)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['PLANNED', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'ARCHIVED', 'CANCELLED'], example: 'SUSPENDED' },
                  isActive: { type: 'boolean', example: false },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'تم تحديث حالة المشروع بنجاح' },
        },
      },
    },
    '/projects/{id}/summary': {
      get: {
        tags: ['5. المشاريع والوحدات العقارية (Projects & Units)'],
        summary: 'جلب الملخص المالي والتحليلي للمشروع',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'الملخص المالي للمشروع (الميزانية، إجمالي المصروفات، المتبقي، نسبة الصرف)' },
        },
      },
    },
    '/projects/{id}/transactions': {
      get: {
        tags: ['5. المشاريع والوحدات العقارية (Projects & Units)'],
        summary: 'جلب كافة سندات ومصروفات المشروع',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'قائمة مصروفات المشروع' },
        },
      },
    },
    '/projects/{projectId}/units': {
      get: {
        tags: ['5. المشاريع والوحدات العقارية (Projects & Units)'],
        summary: 'جلب وحدات المشروع العقارية',
        parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'قائمة وحدات المشروع' } },
      },
      post: {
        tags: ['5. المشاريع والوحدات العقارية (Projects & Units)'],
        summary: 'إضافة وحدة عقارية تابعة للمشروع',
        parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['unitNumber', 'unitType'],
                properties: {
                  unitNumber: { type: 'string', example: 'VILLA-101' },
                  unitType: { type: 'string', example: 'فيلا سكنية' },
                  buildingNumber: { type: 'string', nullable: true, example: 'B-1' },
                  floorNumber: { type: 'string', nullable: true, example: 'G+1' },
                  status: { type: 'string', enum: ['AVAILABLE', 'SOLD', 'RENTED', 'UNDER_MAINTENANCE'], default: 'AVAILABLE' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'تم إضافة الوحدة العقارية بنجاح' } },
      },
    },

    // ─────────────────────────────────────────
    // 6. Users & RBAC
    // ─────────────────────────────────────────
    '/users': {
      get: {
        tags: ['6. المستخدمين والصلاحيات (Users & RBAC)'],
        summary: 'جلب قائمة مستخدمي النظام',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'بحث باسم المستخدم أو الاسم الكامل أو الإيميل' },
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'تصفية حسب الحالة (ACTIVE, INACTIVE)' },
          { name: 'roleName', in: 'query', schema: { type: 'string' }, description: 'تصفية حسب الدور (ADMIN, CASHIER, ...)' },
        ],
        responses: {
          200: { description: 'قائمة المستخدمين' },
        },
      },
      post: {
        tags: ['6. المستخدمين والصلاحيات (Users & RBAC)'],
        summary: 'إنشاء مستخدم جديد',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'fullName', 'password'],
                properties: {
                  username: { type: 'string', minLength: 3, example: 'khalid.accountant', description: 'اسم المستخدم الفريد' },
                  fullName: { type: 'string', minLength: 3, example: 'خالد عبد الله السالم', description: 'الاسم الكامل' },
                  employeeNumber: { type: 'string', nullable: true, example: 'EMP-1008' },
                  email: { type: 'string', format: 'email', nullable: true, example: 'khalid@company.com' },
                  phone: { type: 'string', nullable: true, example: '+966501112233' },
                  password: { type: 'string', minLength: 6, example: 'SecretPass123!' },
                  roleNames: { type: 'array', items: { type: 'string' }, example: ['ACCOUNTANT'] },
                  projectIds: { type: 'array', items: { type: 'integer' }, example: [1, 2] },
                  cashboxIds: { type: 'array', items: { type: 'integer' }, example: [1] },
                  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'تم إنشاء حساب المستخدم بنجاح' },
          400: { description: 'اسم المستخدم أو البريد مستخدم مسبقاً' },
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['6. المستخدمين والصلاحيات (Users & RBAC)'],
        summary: 'جلب بيانات مستخدم محدد والصلاحيات المرتبطة به',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'بيانات وصلاحيات المستخدم' },
          404: { description: 'المستخدم غير موجود' },
        },
      },
      patch: {
        tags: ['6. المستخدمين والصلاحيات (Users & RBAC)'],
        summary: 'تعديل بيانات المستخدم واسم المستخدم (Admin)',
        description: 'تعديل اسم المستخدم (Username)، الاسم، البريد، الهاتف، رقم الموظف، والحالة.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', minLength: 3, example: 'khalid.updated', description: 'تعديل اسم المستخدم (فريد)' },
                  fullName: { type: 'string', example: 'خالد عبد الله السالم المطور' },
                  employeeNumber: { type: 'string', nullable: true, example: 'EMP-1008-B' },
                  email: { type: 'string', format: 'email', nullable: true, example: 'khalid.new@company.com' },
                  phone: { type: 'string', nullable: true, example: '+966509998877' },
                  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'تم تحديث بيانات المستخدم واسم المستخدم بنجاح' },
          400: { description: 'اسم المستخدم الجديد مأخوذ من قبل حساب آخر' },
        },
      },
    },
    '/users/{id}/status': {
      patch: {
        tags: ['6. المستخدمين والصلاحيات (Users & RBAC)'],
        summary: 'تفعيل أو تعطيل حساب المستخدم',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['isActive'],
                properties: {
                  isActive: { type: 'boolean', example: false, description: 'حالة التفعيل (false للتعطيل)' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'تم تحديث حالة حساب المستخدم بنجاح' },
          400: { description: 'لا يمكنك تعطيل حسابك الشخصي أو آخر مدير نشط' },
        },
      },
    },
    '/users/{id}/reset-password': {
      post: {
        tags: ['6. المستخدمين والصلاحيات (Users & RBAC)'],
        summary: 'إعادة تعيين كلمة مرور المستخدم',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['newPassword'],
                properties: {
                  newPassword: { type: 'string', minLength: 6, example: 'NewStrongPassword2026!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'تم إعادة تعيين كلمة المرور بنجاح' },
        },
      },
    },
    '/users/{id}/roles': {
      patch: {
        tags: ['6. المستخدمين والصلاحيات (Users & RBAC)'],
        summary: 'تحديث أدوار وصلاحيات المستخدم',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['roleIds'],
                properties: {
                  roleIds: { type: 'array', items: { type: 'integer' }, example: [1, 2] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'تم تحديث الأدوار بنجاح' },
        },
      },
    },
    '/users/{id}/projects': {
      patch: {
        tags: ['6. المستخدمين والصلاحيات (Users & RBAC)'],
        summary: 'ربط المستخدم بمشاريع محددة',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['projectIds'],
                properties: {
                  projectIds: { type: 'array', items: { type: 'integer' }, example: [1, 3] },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'تم تحديث ربط المشاريع بنجاح' } },
      },
    },
    '/users/{id}/cashboxes': {
      patch: {
        tags: ['6. المستخدمين والصلاحيات (Users & RBAC)'],
        summary: 'ربط المستخدم بصناديق وعهد نقدية',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['cashboxIds'],
                properties: {
                  cashboxIds: { type: 'array', items: { type: 'integer' }, example: [1] },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'تم تحديث ربط الصناديق بنجاح' } },
      },
    },

    // ─────────────────────────────────────────
    // 7. Beneficiaries
    // ─────────────────────────────────────────
    '/beneficiaries': {
      get: {
        tags: ['7. المستفيدين (Beneficiaries)'],
        summary: 'جلب قائمة المستفيدين (موردين، مقاولين، موظفين)',
        parameters: [{ name: 'search', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'قائمة المستفيدين' } },
      },
      post: {
        tags: ['7. المستفيدين (Beneficiaries)'],
        summary: 'إضافة مستفيد جديد',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'beneficiaryType'],
                properties: {
                  name: { type: 'string', example: 'شركة الأفق لمواد البناء' },
                  beneficiaryType: { type: 'string', enum: ['SUPPLIER', 'CONTRACTOR', 'EMPLOYEE', 'GOVERNMENT', 'OTHER'], example: 'SUPPLIER' },
                  commercialName: { type: 'string', nullable: true, example: 'الأفق للتجارة' },
                  taxNumber: { type: 'string', nullable: true, example: '300000000000003' },
                  phone: { type: 'string', nullable: true, example: '+966500000002' },
                  email: { type: 'string', format: 'email', nullable: true, example: 'info@horizon.com' },
                  iban: { type: 'string', nullable: true, example: 'SA0000000000000000000000' },
                  bankName: { type: 'string', nullable: true, example: 'مصرف الراجحي' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'تم إضافة المستفيد بنجاح' } },
      },
    },
    '/beneficiaries/{id}': {
      get: {
        tags: ['7. المستفيدين (Beneficiaries)'],
        summary: 'جلب بيانات مستفيد محدد',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'بيانات المستفيد' } },
      },
      patch: {
        tags: ['7. المستفيدين (Beneficiaries)'],
        summary: 'تعديل بيانات المستفيد',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'شركة الأفق لمواد البناء والتوريد' },
                  phone: { type: 'string', example: '+966555555555' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'تم تحديث بيانات المستفيد بنجاح' } },
      },
    },

    // ─────────────────────────────────────────
    // 8. Expense Categories
    // ─────────────────────────────────────────
    '/expense-categories': {
      get: {
        tags: ['8. تصنيفات المصروفات (Expense Categories)'],
        summary: 'جلب شجرة تصنيفات وبنود المصروفات',
        responses: { 200: { description: 'قائمة تصنيفات المصروفات' } },
      },
      post: {
        tags: ['8. تصنيفات المصروفات (Expense Categories)'],
        summary: 'إضافة تصنيف مصروفات جديد',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code', 'name'],
                properties: {
                  code: { type: 'string', example: 'CAT-101' },
                  name: { type: 'string', example: 'مصاريف نقل وتوصيل' },
                  parentId: { type: 'integer', nullable: true, example: 1 },
                  accountingAccountCode: { type: 'string', nullable: true, example: '5102' },
                  requiresProject: { type: 'boolean', default: false },
                  requiresInvoice: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'تم إضافة تصنيف المصروف بنجاح' } },
      },
    },

    // ─────────────────────────────────────────
    // 9. Cashboxes
    // ─────────────────────────────────────────
    '/cashboxes': {
      get: {
        tags: ['9. الصناديق والعهد (Cashboxes)'],
        summary: 'جلب قائمة الصناديق النقدية',
        responses: { 200: { description: 'قائمة الصناديق' } },
      },
      post: {
        tags: ['9. الصناديق والعهد (Cashboxes)'],
        summary: 'إضافة صندوق نقدي جديد',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code', 'name'],
                properties: {
                  code: { type: 'string', example: 'CB-MAIN-01' },
                  name: { type: 'string', example: 'الصندوق الرئيسي - الإدارة العامة' },
                  branchName: { type: 'string', nullable: true, example: 'الفرع الرئيسي' },
                  custodianUserId: { type: 'integer', nullable: true, example: 1 },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'تم إضافة الصندوق بنجاح' } },
      },
    },
    '/cashboxes/{id}': {
      patch: {
        tags: ['9. الصناديق والعهد (Cashboxes)'],
        summary: 'تحديث بيانات الصندوق',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'صندوق العهدة النقدية - الإدارة' },
                  isActive: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'تم تحديث بيانات الصندوق بنجاح' } },
      },
    },

    // ─────────────────────────────────────────
    // 10. Payment Methods
    // ─────────────────────────────────────────
    '/payment-methods': {
      get: {
        tags: ['10. طرق الدفع (Payment Methods)'],
        summary: 'جلب قائمة طرق الدفع (نقدي، تحويل، شيك، بطاقة)',
        responses: { 200: { description: 'قائمة طرق الدفع' } },
      },
    },

    // ─────────────────────────────────────────
    // 11. System Settings
    // ─────────────────────────────────────────
    '/system-settings': {
      get: {
        tags: ['11. إعدادات النظام (System Settings)'],
        summary: 'جلب إعدادات وسياسات النظام العامة',
        responses: { 200: { description: 'قائمة الإعدادات' } },
      },
    },
    '/system-settings/expenses.project_requirement_mode': {
      patch: {
        tags: ['11. إعدادات النظام (System Settings)'],
        summary: 'تغيير سياسة إلزامية ربط المشروع في المصروفات',
        description: 'تحديد هل ربط المشروع اختياري (OPTIONAL) أو إلزامي عند الإنشاء (REQUIRED_ON_CREATE) أو إلزامي عند الاعتماد (REQUIRED_ON_APPROVAL).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['value'],
                properties: {
                  value: {
                    type: 'string',
                    enum: ['OPTIONAL', 'REQUIRED_ON_APPROVAL', 'REQUIRED_ON_CREATE'],
                    example: 'REQUIRED_ON_APPROVAL',
                    description: 'الوضع الجديد لإلزامية المشروع',
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'تم تحديث سياسة النظام بنجاح وتدوينها في سجل الرقابة' } },
      },
    },

    // ─────────────────────────────────────────
    // 12. Financial Reports
    // ─────────────────────────────────────────
    '/reports/daily-expenses': {
      get: {
        tags: ['12. التقارير المالية والرقابية (Financial Reports)'],
        summary: 'تقرير المصروفات اليومية التفصيلي',
        parameters: [{ name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, example: '2026-08-24' }],
        responses: { 200: { description: 'تقرير المصروفات اليومية' } },
      },
    },
    '/reports/by-project': {
      get: {
        tags: ['12. التقارير المالية والرقابية (Financial Reports)'],
        summary: 'تقرير المصروفات حسب المشروع',
        parameters: [{ name: 'projectId', in: 'query', schema: { type: 'integer' } }],
        responses: { 200: { description: 'تقرير مصروفات المشاريع' } },
      },
    },
    '/reports/by-beneficiary': {
      get: {
        tags: ['12. التقارير المالية والرقابية (Financial Reports)'],
        summary: 'تقرير المصروفات حسب المستفيدين والموردين',
        responses: { 200: { description: 'تقرير مصروفات المستفيدين' } },
      },
    },
    '/reports/by-category': {
      get: {
        tags: ['12. التقارير المالية والرقابية (Financial Reports)'],
        summary: 'تقرير المصروفات حسب بنود وتصنيفات الصرف',
        responses: { 200: { description: 'تقرير بنود المصروفات' } },
      },
    },
    '/reports/unassigned-project-transactions': {
      get: {
        tags: ['12. التقارير المالية والرقابية (Financial Reports)'],
        summary: 'تقرير السندات غير المربوطة بمشاريع',
        responses: { 200: { description: 'قائمة السندات التي بحاجة لربط بالمشاريع' } },
      },
    },
    '/reports/pending-invoices': {
      get: {
        tags: ['12. التقارير المالية والرقابية (Financial Reports)'],
        summary: 'تقرير المشتريات المعلقة بدون فواتير ضريبية',
        responses: { 200: { description: 'تقرير الفواتير المعلقة' } },
      },
    },
    '/reports/manual-vouchers': {
      get: {
        tags: ['12. التقارير المالية والرقابية (Financial Reports)'],
        summary: 'تقرير تتبع دفاتر وسندات الصرف اليدوية',
        responses: { 200: { description: 'تقرير السندات والدفاتر اليدوية' } },
      },
    },

    // ─────────────────────────────────────────
    // 13. Audit Logs
    // ─────────────────────────────────────────
    '/audit-logs': {
      get: {
        tags: ['13. سجل التدقيق والرقابة (Audit Logs)'],
        summary: 'جلب سجل التدقيق والرقابة الشامل مع التصفية والصفحات',
        parameters: [
          { name: 'entityType', in: 'query', schema: { type: 'string' }, example: 'USER' },
          { name: 'action', in: 'query', schema: { type: 'string' }, example: 'UPDATE_USER' },
          { name: 'userId', in: 'query', schema: { type: 'integer' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          200: { description: 'سجل التدقيق والتعديلات مع ترقيم الصفحات' },
        },
      },
    },
  },
};
