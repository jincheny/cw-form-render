# 更新日志

### 1.0.2 (2025-11-05)

#### ✨ 新增功能

**全局扁平化配置 `flattenData`**
- 新增 `flattenData` 配置项，一键启用全局数据扁平化
- 启用后，`getValues()`、`watch`、`onFinish` 等所有数据都会自动移除布局容器层级
- 无需手动调用 `getFlatValues()`，简化开发流程
- **智能识别布局容器**：根据 `widget` 类型自动识别，无需修改 schema 的 `type`

#### 🔧 优化改进

**自动识别布局容器 widget**
- 支持根据 `widget` 类型自动识别布局容器，无需强制要求 `type: 'void'`
- 支持的布局 widget：`collapse`、`boxCollapse`、`card`、`boxcard`、`boxLineTitle`、`boxSubInline` 等
- 大幅降低使用成本，不需要修改现有 schema

**watch 智能路径匹配**
- 修复 `watch` 监听时的路径问题，支持自动匹配布局容器内的字段
- 现在可以直接使用字段名监听，无需包含布局容器的路径
- **完全向后兼容**：原有的完整路径写法依然有效

#### 使用示例

##### 全局扁平化配置

```typescript
// 启用全局扁平化
<FormRender
  form={form}
  schema={schema}
  flattenData={true}  // 🔥 一键启用扁平化
  watch={{
    '#': (allValues, changedValues) => {
      // ✅ 数据已自动扁平化
      console.log(changedValues); 
      // 输出: { license_key: 'xxx', state_dict: {...} }
      // 不再是: { SoftwareLicense: { license_key: 'xxx', state_dict: {...} } }
      
      // 直接访问字段，无需处理容器嵌套
      const { license_key, state_dict } = changedValues;
    },
    'license_key': (value) => {
      // ✅ 直接监听字段
      console.log('license_key 变化:', value);
    }
  }}
  onFinish={(values) => {
    // ✅ 提交的数据也是扁平的
    console.log(values);
    // 输出: { license_key: 'xxx', state_dict: {...} }
  }}
/>

// form.getValues() 也会返回扁平化数据
const values = form.getValues();
// ✅ 输出: { license_key: 'xxx', state_dict: {...} }
```

##### watch 智能路径匹配

```typescript
// Schema 定义
{
  type: 'object',
  properties: {
    SoftwareLicense: {
      type: 'void',  // 布局容器
      widget: 'collapse',
      properties: {
        license_key: { 
          type: 'string',
          title: '许可证密钥' 
        }
      }
    }
  }
}

// ✅ 方式1：简化写法（推荐）- 直接使用字段名
watch = {
  'license_key': (value) => {
    console.log('license_key 变化:', value);
  }
}

// ✅ 方式2：完整路径写法（兼容旧代码）
watch = {
  'SoftwareLicense.license_key': (value) => {
    console.log('license_key 变化:', value);
  }
}

// 两种写法都可以正常工作，不影响现有代码！
```

#### 兼容性说明

- ✅ 旧代码无需修改，完整路径依然有效
- ✅ 新代码可以使用简化的字段名路径
- ✅ 自动智能匹配，无需关心字段在哪个 void 容器内

---

### 1.0.0 (2025-11-05)

#### ✨ 新增功能

**通过字段名操作 API**
- 新增 `getSchemaByName(name)` - 通过字段名获取 Schema，无需完整路径
- 新增 `setSchemaByName(name, schema)` - 通过字段名直接设置 Schema 配置
- 新增 `getValueByName(name)` - 通过字段名获取表单值
- 新增 `setValueByName(name, value)` - 通过字段名设置表单值

**扁平化数据获取**
- 新增 `getFlatValues(nameList?, filterFunc?, notFilterUndefined?)` - 自动移除 void 类型容器（如 collapse、group 等布局容器）的数据层级，解决分组容器带来的不必要嵌套问题

#### 使用示例

```typescript
// 通过字段名直接操作，无需知道完整路径
form.setSchemaByName('userName', { hidden: true });
form.setValueByName('userName', '张三');
const schema = form.getSchemaByName('userName');
const value = form.getValueByName('userName');

// 获取扁平化数据，去除布局容器层级
const flatValues = form.getFlatValues();
// 如果 schema 中有 type: 'void' 的分组容器
// 原本: { basicInfo: { userName: '张三', age: 25 } }
// 现在: { userName: '张三', age: 25 }
```

#### 🔧 优化改进

- 保持所有原有 API 完全向后兼容，无破坏性变更
- 完善 TypeScript 类型定义

