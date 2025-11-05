# 更新日志

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

