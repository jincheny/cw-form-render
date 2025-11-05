# cw-form-render

<div align="center">
  <h3>基于 JSON Schema 的动态表单解决方案</h3>
  <p>基于 form-render 二次开发，通过 JSON Schema 生成标准 Form，常用于自定义搭建配置界面</p>
</div>

## ✨ 特性

- 🚀 **JSON Schema 驱动** - 通过配置快速生成复杂表单
- 🎯 **简化 API** - 支持通过字段名直接操作，无需完整路径
- 📦 **扁平化数据** - 自动处理布局容器嵌套，获取扁平化数据结构
- 🎨 **基于 Ant Design** - 开箱即用的精美 UI 组件
- 💪 **TypeScript 支持** - 完整的类型定义
- 🔧 **高度可定制** - 支持自定义组件和校验规则
- ⚡ **性能优化** - 基于 zustand 的高效状态管理

## 📦 安装

```bash
npm install cw-form-render
# 或
yarn add cw-form-render
# 或
pnpm add cw-form-render
```

**注意**: 需要同时安装 React 和 Ant Design:

```bash
npm install react react-dom antd
```

## 🚀 快速开始

```tsx
import React from 'react';
import FormRender, { useForm } from 'cw-form-render';

const schema = {
  type: 'object',
  properties: {
    userName: {
      title: '用户名',
      type: 'string',
      required: true,
    },
    age: {
      title: '年龄',
      type: 'number',
      minimum: 0,
    },
  },
};

const App = () => {
  const form = useForm();

  const onFinish = (values) => {
    console.log('表单数据:', values);
  };

  return (
    <FormRender
      form={form}
      schema={schema}
      onFinish={onFinish}
    />
  );
};

export default App;
```

## 📖 核心 API

### 通过字段名操作 API (v1.0.0+)

简化 API，无需记住完整的字段路径：

```typescript
// 获取/设置 Schema
form.getSchemaByName('userName');
form.setSchemaByName('userName', { hidden: true });

// 获取/设置表单值
form.getValueByName('userName');
form.setValueByName('userName', '张三');
```

### 扁平化数据获取 (v1.0.0+)

自动移除 void 类型容器（如 collapse、group 等布局容器）的数据层级：

```typescript
// 获取扁平化的表单数据
const flatValues = form.getFlatValues();

// 示例：
// 原始数据: { basicInfo: { userName: '张三', age: 25 } }
// 扁平化后: { userName: '张三', age: 25 }
```

### FormInstance API

```typescript
// 表单操作
form.submit()                    // 提交表单
form.resetFields()               // 重置表单
form.setValues(values)           // 设置表单值
form.getValues()                 // 获取表单值
form.setValueByPath(path, value) // 通过路径设置值
form.getValueByPath(path)        // 通过路径获取值

// Schema 操作
form.setSchema(schema)           // 设置整个 Schema
form.setSchemaByPath(path, schema) // 通过路径设置 Schema
form.getSchemaByPath(path)       // 通过路径获取 Schema

// 校验
form.validateFields()            // 校验所有字段
form.validateFieldsByPath(paths) // 校验指定字段
```

## 🎯 Schema 配置示例

### 基础类型

```typescript
const schema = {
  type: 'object',
  properties: {
    // 文本输入
    text: {
      title: '文本',
      type: 'string',
    },
    // 数字输入
    number: {
      title: '数字',
      type: 'number',
      minimum: 0,
      maximum: 100,
    },
    // 单选
    radio: {
      title: '单选',
      type: 'string',
      enum: ['a', 'b', 'c'],
      enumNames: ['选项A', '选项B', '选项C'],
      widget: 'radio',
    },
    // 多选
    checkbox: {
      title: '多选',
      type: 'array',
      items: {
        type: 'string',
      },
      enum: ['a', 'b', 'c'],
      enumNames: ['选项A', '选项B', '选项C'],
      widget: 'checkbox',
    },
  },
};
```

### 布局容器

```typescript
const schema = {
  type: 'object',
  properties: {
    // 折叠面板
    collapse: {
      type: 'void',
      widget: 'collapse',
      properties: {
        userName: {
          title: '用户名',
          type: 'string',
        },
      },
    },
    // 卡片
    card: {
      type: 'void',
      widget: 'card',
      properties: {
        email: {
          title: '邮箱',
          type: 'string',
        },
      },
    },
  },
};
```

### 列表/数组

```typescript
const schema = {
  type: 'object',
  properties: {
    list: {
      title: '列表',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            title: '名称',
            type: 'string',
          },
          age: {
            title: '年龄',
            type: 'number',
          },
        },
      },
    },
  },
};
```

## 🔧 高级用法

### 自定义组件

```tsx
import FormRender, { useForm } from 'cw-form-render';

const CustomWidget = ({ value, onChange, schema }) => {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

const App = () => {
  const form = useForm();

  return (
    <FormRender
      form={form}
      schema={schema}
      widgets={{ custom: CustomWidget }}
    />
  );
};
```

### 监听字段变化

```tsx
const schema = {
  type: 'object',
  properties: {
    country: {
      title: '国家',
      type: 'string',
      widget: 'select',
    },
    city: {
      title: '城市',
      type: 'string',
      widget: 'select',
      // 监听 country 字段变化
      dependencies: ['country'],
    },
  },
};
```

## 🆕 最新更新

### v1.0.2 - 全局扁平化配置

新增 `flattenData` 配置，一键启用全局数据扁平化，让表单数据处理更简单！**智能识别布局容器，无需修改 schema！**

```typescript
// ✅ 启用全局扁平化
<FormRender
  form={form}
  schema={schema}
  flattenData={true}  // 🔥 一键搞定！
  watch={{
    '#': (allValues, changedValues) => {
      // 数据已自动扁平化，直接访问字段
      const { license_key, state_dict } = changedValues;
      // 不再需要: changedValues.SoftwareLicense.license_key
    }
  }}
  onFinish={(values) => {
    // 提交的数据也是扁平的
    console.log(values); 
    // => { license_key: 'xxx', state_dict: {...} }
  }}
/>
```

**优势：**
- ✅ 一次配置，全局生效
- ✅ `getValues()`、`watch`、`onFinish` 等所有数据都自动扁平化
- ✅ 无需关心 void 容器嵌套
- ✅ 代码更简洁清晰

**智能路径匹配：**
同时支持字段名监听，向后兼容完整路径写法。

```typescript
watch = {
  // ✅ 简化写法（推荐）
  'license_key': (value) => console.log(value),
  
  // ✅ 完整路径（兼容）
  'SoftwareLicense.license_key': (value) => console.log(value)
}
```

### v1.0.0 - 简化的 API 和扁平化数据

#### 1. 通过字段名直接操作

```typescript
// ✅ 新方式 - 直接使用字段名
form.setSchemaByName('userName', { hidden: true });
form.getSchemaByName('userName');
form.setValueByName('userName', '张三');
form.getValueByName('userName');

// ❌ 旧方式 - 需要完整路径
form.setSchemaByPath('basicInfo.userName', { hidden: true });
```

#### 2. 扁平化数据获取

```typescript
// Schema 包含 void 布局容器
{
  properties: {
    basicInfo: {
      type: 'void',
      widget: 'collapse',
      properties: {
        userName: { type: 'string' },
        age: { type: 'number' }
      }
    }
  }
}

// getValues() - 包含容器层级
form.getValues() 
// => { basicInfo: { userName: '张三', age: 25 } }

// getFlatValues() - 自动扁平化
form.getFlatValues()
// => { userName: '张三', age: 25 }
```

## 📚 更多资源

- [更新日志](./CHANGELOG.md)
- [问题反馈](https://github.com/jincheny/cw-form-render/issues)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT](./LICENSE) © jincheny
