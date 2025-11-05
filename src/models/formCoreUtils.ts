import { isObject, isArray, _get, _has, isFunction, isObjType } from '../utils';

const executeCallBack = (watchItem: any, value: any, path: string, index?: any) => {
  if (isFunction(watchItem)) {
    try {
      watchItem(value, index);
    } catch (error) {
      console.log(`${path}对应的watch函数执行报错：`, error);
    }
  }

  if (isFunction(watchItem?.handler)) {
    try {
      watchItem.handler(value, index);
    } catch (error) {
      console.log(`${path}对应的watch函数执行报错：`, error);
    }
  }
};

const traverseValues = ({ changedValues, allValues, flatValues }) => {

  const traverseArray = (list: any[], fullList: any, path: string, index: number[]) => {
    if (!list.length) {
      return
    }

    const _path = path += '[]';
    const filterLength = list.filter(item => (item || item === undefined)).length;

    let flag = filterLength !== fullList.length || list.length === 1;
    let isRemove = false;
    if (filterLength > 1 && filterLength < fullList.length) {
      flag = false;
      isRemove = true;
    }

    list.forEach((item: any, idx: number) => {
      if (!isRemove) {
        flatValues[_path] =  { value: fullList[idx], index };
      }
      if (isObject(item)) {
        traverseObj(item, fullList[idx], _path, [...index, idx], !flag);
      }
      if (isArray(item)) {
        traverseArray(item, fullList[idx], _path, [...index, idx]);
      }
    });
  };

  const traverseObj = (obj: any, fullObj: any, path: string, index: number[], flag?: boolean) => {
    Object.keys(obj).forEach((key: string) => {
      const item = obj[key];
      const fullItem = fullObj?.[key];
      let value = item;

      const _path = path ? (path + '.' + key) : key;

      let last = true;

      if (isArray(item)) {
        value = fullItem ? [...fullItem] : fullItem;
        last = false;
        traverseArray(item, fullItem, _path, index);
      }

      if (isObject(item)) {
        last = false;
        traverseObj(item, fullItem, _path, index, flag);
      }

      if (!last || !flag) {
        flatValues[_path] =  { value, index };
      }
    });
  };

  traverseObj(changedValues, allValues, null, []);
};

// 移除路径中的 void 容器部分
const removeFlattenVoidContainers = (path: string, flattenSchema: any) => {
  if (!flattenSchema || !path) {
    return [];
  }

  const voidContainers: string[] = [];

  // 找出所有 void 类型的容器
  Object.keys(flattenSchema).forEach(key => {
    const schema = flattenSchema[key]?.schema;
    if (schema?.type === 'void' && !schema?.bind) {
      const cleanPath = key.replace(/\[\]/g, '').replace(/^#\.?/, '');
      if (cleanPath) {
        voidContainers.push(cleanPath);
      }
    }
  });

  // 按路径长度排序，从长到短（先处理深层的）
  voidContainers.sort((a, b) => b.length - a.length);

  // 生成可能的路径变体
  const pathVariants = [path];

  voidContainers.forEach(voidPath => {
    const newVariants: string[] = [];
    pathVariants.forEach(variant => {
      // 如果路径中包含这个 void 容器，生成移除它后的版本
      if (variant.includes(voidPath + '.')) {
        newVariants.push(variant.replace(voidPath + '.', ''));
      } else if (variant === voidPath) {
        // 如果完全匹配 void 路径，则跳过
        return;
      }
    });
    pathVariants.push(...newVariants);
  });

  return [...new Set(pathVariants)]; // 去重
};

// 扁平化 values（移除 void 容器层级）
const flattenValues = (values: any, flattenSchema: any) => {
  if (!flattenSchema || !values) {
    return values;
  }

  const voidPaths = Object.keys(flattenSchema).filter(key => {
    const schema = flattenSchema[key]?.schema;
    return schema?.type === 'void' && !schema?.bind;
  });

  if (voidPaths.length === 0) {
    return values;
  }

  const result = JSON.parse(JSON.stringify(values)); // 深拷贝

  // 按路径深度排序，从深到浅处理
  voidPaths.sort((a, b) => {
    const depthA = (a.match(/\./g) || []).length;
    const depthB = (b.match(/\./g) || []).length;
    return depthB - depthA;
  });

  voidPaths.forEach(voidPath => {
    // 移除 [] 标记和开头的 #
    const cleanPath = voidPath.replace(/\[\]/g, '').replace(/^#\.?/, '');
    if (!cleanPath) return;

    const pathParts = cleanPath.split('.');
    const voidKey = pathParts[pathParts.length - 1];
    const parentPath = pathParts.slice(0, -1);

    // 获取父级对象
    let parent = result;
    for (const part of parentPath) {
      if (!parent[part]) return;
      parent = parent[part];
    }

    // 如果 void 容器存在且有值
    if (parent[voidKey] && typeof parent[voidKey] === 'object' && !Array.isArray(parent[voidKey])) {
      const voidContainer = parent[voidKey];
      // 将 void 容器的子字段提升到父级
      Object.keys(voidContainer).forEach(childKey => {
        parent[childKey] = voidContainer[childKey];
      });
      // 删除 void 容器本身
      delete parent[voidKey];
    }
  });

  return result;
};

export const valuesWatch = (changedValues: any, allValues: any, watch: any, flattenSchema?: any, shouldFlatten?: boolean) => {
  if (Object.keys(watch || {})?.length === 0) {
    return;
  }

  // 如果启用了全局扁平化，扁平化数据
  let processedChangedValues = changedValues;
  let processedAllValues = allValues;

  if (shouldFlatten && flattenSchema) {
    processedChangedValues = flattenValues(changedValues, flattenSchema);
    processedAllValues = flattenValues(allValues, flattenSchema);
  }

  const flatValues = {
    '#': { value: processedAllValues, index: processedChangedValues }
  };

  traverseValues({ changedValues: processedChangedValues, allValues: processedAllValues, flatValues });

  Object.keys(watch).forEach(watchPath => {
    const item = watch[watchPath];

    // 如果没有启用全局扁平化，使用智能路径匹配
    if (!shouldFlatten && flattenSchema) {
      // 生成该 watch 路径的所有可能变体（原始路径 + 扁平化后的路径）
      const pathVariants = removeFlattenVoidContainers(watchPath, flattenSchema);

      // 尝试匹配任意一个路径变体
      for (const path of pathVariants) {
        if (_has(flatValues, path)) {
          const { value, index } = _get(flatValues, path) as { value: any; index: any; };
          executeCallBack(item, value, watchPath, index);
          return;
        }
      }

      // 兼容处理：如果 watchPath 没有 void 容器，但 flatValues 中的路径包含 void 容器
      // 则尝试匹配包含 void 容器的完整路径
      Object.keys(flatValues).forEach(flatPath => {
        const variants = removeFlattenVoidContainers(flatPath, flattenSchema);
        if (variants.includes(watchPath)) {
          const { value, index } = _get(flatValues, flatPath) as { value: any; index: any; };
          executeCallBack(item, value, watchPath, index);
        }
      });
    } else {
      // 启用了全局扁平化或没有 flattenSchema，直接匹配
      if (_has(flatValues, watchPath)) {
        const { value, index } = _get(flatValues, watchPath) as { value: any; index: any; };
        executeCallBack(item, value, watchPath, index);
      }
    }
  });
};

export const transformFieldsData = (_fieldsError: any, getFieldName: any) => {
  let fieldsError = _fieldsError;
  if (isObject(fieldsError)) {
    fieldsError = [fieldsError];
  }

  if (!(isArray(fieldsError) && fieldsError.length > 0)) {
    return;
  }

  return fieldsError.map((field: any) => ({ errors: field.error, ...field, name: getFieldName(field.name) }));
};

export const immediateWatch = (watch: any, values: any, flattenSchema?: any, shouldFlatten?: boolean) => {
  if (Object.keys(watch || {})?.length === 0) {
    return;
  }

  const watchObj = {};
  Object.keys(watch).forEach(key => {
    const watchItem = watch[key];
    if (watchItem?.immediate && isFunction(watchItem?.handler)) {
      watchObj[key] = watchItem;
    }
  });

  valuesWatch(values, values, watchObj, flattenSchema, shouldFlatten);
};

export const getSchemaFullPath = (path: string, schema: any) => {
  if (!path || !path.includes('.')) {
    return 'properties.' + path;
  }

  // 补全 list 类型 path 路径
  while(path.includes('[]')) {
    const index = path.indexOf('[]');
    path = path.substring(0, index) + '.items' + path.substring(index + 2);
  }

  // 补全 object 类型 path 路径
  let result = 'properties';
  const pathList = path.split('.');
  pathList.forEach((item, index) => {
    const key = result + '.' + item;
    const itemSchema = _get(schema, key, {});
    if (isObjType(itemSchema) && index !== pathList.length-1) {
      result = key + '.properties';
      return ;
    }
    result = key;
  });

  return result;
};

export function yymmdd(timeStamp) {
  const date_ob = new Date(Number(timeStamp));
  const adjustZero = num => ('0' + num).slice(-2);
  let day = adjustZero(date_ob.getDate());
  let month = adjustZero(date_ob.getMonth());
  let year = date_ob.getFullYear();
  let hours = adjustZero(date_ob.getHours());
  let minutes = adjustZero(date_ob.getMinutes());
  let seconds = adjustZero(date_ob.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function msToTime(duration) {
  let seconds: any = Math.floor((duration / 1000) % 60);
  let minutes: any = Math.floor((duration / (1000 * 60)) % 60);
  let hours: any = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;
  return hours + ':' + minutes + ':' + seconds;
}

export const getSessionItem = (key: string) => {
  return Number(sessionStorage.getItem(key) || 0);
}

export const setSessionItem = (key: string, data: any) => {
  sessionStorage.setItem(key, data +'');
}

