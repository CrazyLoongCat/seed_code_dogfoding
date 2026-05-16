import type { FormTemplate } from '../types';

export const expenseReportTemplate: FormTemplate = {
  id: 'expense-report-001',
  name: '费用报销申请表',
  description: '用于员工日常费用报销申请，包括差旅费、招待费、办公费等',
  version: '1.0.0',
  sections: [
    {
      id: 'section-basic',
      title: '基本信息',
      description: '请填写报销申请的基本信息',
      fields: [
        {
          id: 'field-applicant',
          type: 'text',
          label: '申请人',
          name: 'applicant',
          placeholder: '请输入申请人姓名',
          required: true,
          validations: [
            { type: 'min_length', value: 2, message: '姓名至少2个字符' }
          ]
        },
        {
          id: 'field-department',
          type: 'select',
          label: '所属部门',
          name: 'department',
          required: true,
          options: [
            { label: '技术部', value: 'tech' },
            { label: '产品部', value: 'product' },
            { label: '市场部', value: 'marketing' },
            { label: '财务部', value: 'finance' },
            { label: '人事部', value: 'hr' },
            { label: '其他', value: 'other' }
          ]
        },
        {
          id: 'field-apply-date',
          type: 'date',
          label: '申请日期',
          name: 'applyDate',
          required: true
        },
        {
          id: 'field-expense-type',
          type: 'select',
          label: '报销类型',
          name: 'expenseType',
          required: true,
          options: [
            { label: '差旅费', value: 'travel' },
            { label: '业务招待费', value: 'entertainment' },
            { label: '办公用品', value: 'office' },
            { label: '通讯费', value: 'communication' },
            { label: '其他', value: 'other' }
          ]
        }
      ]
    },
    {
      id: 'section-travel',
      title: '差旅信息',
      description: '仅当报销类型为"差旅费"时显示',
      visibleCondition: {
        logic: 'AND',
        conditions: [
          { fieldId: 'expenseType', operator: '==', value: 'travel' }
        ]
      },
      fields: [
        {
          id: 'field-travel-destination',
          type: 'text',
          label: '出差目的地',
          name: 'travelDestination',
          placeholder: '请输入出差目的地',
          required: true
        },
        {
          id: 'field-travel-start',
          type: 'date',
          label: '出差开始日期',
          name: 'travelStartDate',
          required: true
        },
        {
          id: 'field-travel-end',
          type: 'date',
          label: '出差结束日期',
          name: 'travelEndDate',
          required: true
        },
        {
          id: 'field-travel-days',
          type: 'number',
          label: '出差天数',
          name: 'travelDays',
          formula: {
            formula: 'Math.ceil((new Date({{travelEndDate}}) - new Date({{travelStartDate}})) / (1000 * 60 * 60 * 24)) + 1',
            dependencies: ['travelStartDate', 'travelEndDate']
          },
          helpText: '根据开始和结束日期自动计算'
        }
      ]
    },
    {
      id: 'section-expense-detail',
      title: '费用明细',
      description: '请详细填写各项费用明细',
      fields: [
        {
          id: 'section-transport',
          type: 'section',
          label: '交通费用',
          name: 'transportSection',
          helpText: '填写机票、火车票、出租车等交通费用',
          children: [
            {
              id: 'field-transport-air',
              type: 'number',
              label: '机票费用',
              name: 'transportAir',
              placeholder: '0.00',
              defaultValue: 0,
              validations: [
                { type: 'min', value: 0, message: '金额不能为负数' }
              ]
            },
            {
              id: 'field-transport-train',
              type: 'number',
              label: '火车/高铁费用',
              name: 'transportTrain',
              placeholder: '0.00',
              defaultValue: 0,
              validations: [
                { type: 'min', value: 0, message: '金额不能为负数' }
              ]
            },
            {
              id: 'field-transport-taxi',
              type: 'number',
              label: '出租车费用',
              name: 'transportTaxi',
              placeholder: '0.00',
              defaultValue: 0,
              validations: [
                { type: 'min', value: 0, message: '金额不能为负数' }
              ]
            },
            {
              id: 'field-transport-total',
              type: 'number',
              label: '交通费用小计',
              name: 'transportTotal',
              formula: {
                formula: '{{transportAir}} + {{transportTrain}} + {{transportTaxi}}',
                dependencies: ['transportAir', 'transportTrain', 'transportTaxi']
              }
            }
          ]
        },
        {
          id: 'section-accommodation',
          type: 'section',
          label: '住宿费用',
          name: 'accommodationSection',
          children: [
            {
              id: 'field-hotel-fee',
              type: 'number',
              label: '酒店费用',
              name: 'hotelFee',
              placeholder: '0.00',
              defaultValue: 0,
              validations: [
                { type: 'min', value: 0, message: '金额不能为负数' }
              ]
            }
          ]
        },
        {
          id: 'section-meal',
          type: 'section',
          label: '餐饮费用',
          name: 'mealSection',
          children: [
            {
              id: 'field-meal-fee',
              type: 'number',
              label: '餐饮费用',
              name: 'mealFee',
              placeholder: '0.00',
              defaultValue: 0,
              validations: [
                { type: 'min', value: 0, message: '金额不能为负数' }
              ]
            }
          ]
        },
        {
          id: 'section-other',
          type: 'section',
          label: '其他费用',
          name: 'otherSection',
          visibleCondition: {
            logic: 'AND',
            conditions: [
              { fieldId: 'expenseType', operator: '==', value: 'other' }
            ]
          },
          children: [
            {
              id: 'field-other-fee',
              type: 'number',
              label: '其他费用金额',
              name: 'otherFee',
              placeholder: '0.00',
              defaultValue: 0
            },
            {
              id: 'field-other-desc',
              type: 'text',
              label: '费用说明',
              name: 'otherDesc',
              placeholder: '请说明其他费用的具体内容'
            }
          ]
        }
      ]
    },
    {
      id: 'section-summary',
      title: '费用汇总',
      fields: [
        {
          id: 'field-total-amount',
          type: 'number',
          label: '报销总金额',
          name: 'totalAmount',
          formula: {
            formula: '{{transportTotal}} + {{hotelFee}} + {{mealFee}} + {{otherFee}}',
            dependencies: ['transportTotal', 'hotelFee', 'mealFee', 'otherFee']
          },
          required: true,
          validations: [
            { type: 'min', value: 1, message: '报销总金额必须大于0' }
          ]
        },
        {
          id: 'field-payment-method',
          type: 'select',
          label: '支付方式',
          name: 'paymentMethod',
          required: true,
          options: [
            { label: '银行转账', value: 'bank' },
            { label: '现金', value: 'cash' },
            { label: '支付宝', value: 'alipay' },
            { label: '微信支付', value: 'wechat' }
          ]
        },
        {
          id: 'field-bank-info',
          type: 'section',
          label: '银行账户信息',
          name: 'bankInfoSection',
          visibleCondition: {
            logic: 'AND',
            conditions: [
              { fieldId: 'paymentMethod', operator: '==', value: 'bank' }
            ]
          },
          children: [
            {
              id: 'field-bank-name',
              type: 'text',
              label: '开户银行',
              name: 'bankName',
              placeholder: '请输入开户银行名称',
              required: true
            },
            {
              id: 'field-bank-account',
              type: 'text',
              label: '银行账号',
              name: 'bankAccount',
              placeholder: '请输入银行账号',
              required: true,
              validations: [
                { type: 'pattern', value: '^\\d{16,19}$', message: '请输入有效的银行账号' }
              ]
            },
            {
              id: 'field-account-name',
              type: 'text',
              label: '账户名',
              name: 'accountName',
              placeholder: '请输入账户持有人姓名',
              required: true
            }
          ]
        }
      ]
    },
    {
      id: 'section-attachments',
      title: '附件信息',
      fields: [
        {
          id: 'field-has-invoice',
          type: 'select',
          label: '是否有发票',
          name: 'hasInvoice',
          required: true,
          options: [
            { label: '是', value: 'yes' },
            { label: '否', value: 'no' }
          ]
        },
        {
          id: 'field-invoice-count',
          type: 'number',
          label: '发票张数',
          name: 'invoiceCount',
          visibleCondition: {
            logic: 'AND',
            conditions: [
              { fieldId: 'hasInvoice', operator: '==', value: 'yes' }
            ]
          },
          defaultValue: 1,
          validations: [
            { type: 'min', value: 1, message: '至少需要1张发票' }
          ]
        },
        {
          id: 'field-remark',
          type: 'text',
          label: '备注说明',
          name: 'remark',
          placeholder: '请输入其他需要说明的事项'
        }
      ]
    }
  ],
  validations: [
    {
      id: 'validate-travel-dates',
      fields: ['travelStartDate', 'travelEndDate'],
      validation: (values) => {
        if (!values.expenseType || values.expenseType !== 'travel') return true;
        if (!values.travelStartDate || !values.travelEndDate) return true;
        return new Date(String(values.travelEndDate)) >= new Date(String(values.travelStartDate));
      },
      message: '出差结束日期不能早于开始日期'
    }
  ]
};
