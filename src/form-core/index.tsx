import React, { useEffect, useContext, FC, useMemo } from 'react';
import { Form, Row, Col, Button, Space, ConfigProvider } from 'antd';
import classNames from 'classnames';
import { cloneDeep } from 'lodash-es';
import { useStore } from 'zustand';

import { FRContext } from '../models/context';
import transformProps from '../models/transformProps';
import { parseValuesToBind } from '../models/bindValues';
import filterValuesHidden from '../models/filterValuesHidden';
import filterValuesUndefined from '../models/filterValuesUndefined';
import { getFormItemLayout } from '../models/layout';
import { translation, isFunction } from '../utils';

import {
  valuesWatch,
  immediateWatch,
  yymmdd,
  msToTime,
  getSessionItem,
  setSessionItem
} from '../models/formCoreUtils';

import { FRProps } from '../type';
import RenderCore from '../render-core';
import './index.less';

const FormCore:FC<FRProps> = (props) => {
  const store: any = useContext(FRContext);
  const schema = useStore(store, (state: any) => state.schema);
  const flattenSchema = useStore(store, (state: any) => state.flattenSchema);
  const setContext = useStore(store, (state: any) => state.setContext);

  const configCtx = useContext(ConfigProvider.ConfigContext);
  const t = translation(configCtx);

  const { type, properties, ...schemProps } = schema || {};
  const {
    formProps,
    displayType,
    beforeFinish,
    watch,
    onMount,
    column,
    labelWidth,
    labelCol,
    fieldCol,
    maxWidth,
    form,
    onFinish,
    onFinishFailed,
    readOnly,
    disabled,
    footer,
    removeHiddenData,
    flattenData,
    operateExtra,
    logOnMount,
    logOnSubmit,
    id,
    className,
    validateTrigger,
    antdVersion,
  } = transformProps({ ...props, ...schemProps });

  useEffect(() => {
    form.__initStore(store);
    setTimeout(initial, 0);
    (window as any).antdVersion = antdVersion;
  }, []);

  useEffect(() => {
    form.setSchema(props.schema, true);
  }, [JSON.stringify(props.schema || {})]);

  useEffect(() => {
    store.setState({ removeHiddenData, flattenData });
  }, [removeHiddenData, flattenData]);

  useEffect(() => {
    const context = {
      column,
      readOnly,
      disabled,
      labelWidth,
      displayType,
      labelCol,
      fieldCol,
      maxWidth,
      validateTrigger
    };
    setContext(context);
  }, [column, labelCol, fieldCol, displayType, labelWidth, maxWidth, readOnly, disabled, validateTrigger]);

  const initial = async () => {
    onMount && await onMount();
    onMountLogger();
    setTimeout(() => {
      const values = form.getValues();
      immediateWatch(watch, values, flattenSchema, flattenData);
    }, 0);
  };

  const onMountLogger = () => {
    const start = new Date().getTime();
    if (isFunction(logOnMount)|| isFunction(logOnSubmit)) {
      setSessionItem('FORM_MOUNT_TIME', start);
      setSessionItem('FORM_START', start);
    }
    if (isFunction(logOnMount)) {
      const logParams: any = {
        schema: props.schema,
        url: location.href,
        formData: JSON.stringify(form.getValues()),
        formMount: yymmdd(start),
      };
      if (id) {
        logParams.id = id;
      }
      logOnMount(logParams);
    }
    // 如果是要计算时间，在 onMount 时存一个时间戳
    if (isFunction(logOnSubmit)) {
      setSessionItem('NUMBER_OF_SUBMITS', 0);
      setSessionItem('FAILED_ATTEMPTS', 0);
    }
  };

  const onSubmitLogger = (params: any) => {
    if (!isFunction(logOnSubmit)) {
      return;
    }

    const start = getSessionItem('FORM_START');
    const mount = getSessionItem('FORM_MOUNT_TIME');

    const numberOfSubmits = getSessionItem('NUMBER_OF_SUBMITS') + 1;
    const end = new Date().getTime();

    let failedAttempts = getSessionItem('FAILED_ATTEMPTS');
    if (params.errorFields.length > 0) {
      failedAttempts = failedAttempts + 1;
    }
    const logParams: any = {
      formMount: yymmdd(mount),
      ms: end - start,
      duration: msToTime(end - start),
      numberOfSubmits: numberOfSubmits,
      failedAttempts: failedAttempts,
      url: location.href,
      formData: JSON.stringify(params.values),
      errors: JSON.stringify(params.errorFields),
      schema: JSON.stringify(schema),
    };
    if (id) {
      logParams.id = id;
    }
    logOnSubmit(logParams);
    setSessionItem('FORM_START', end);
    setSessionItem('NUMBER_OF_SUBMITS', numberOfSubmits);
    setSessionItem('FAILED_ATTEMPTS', failedAttempts);
  };

  const handleValuesChange = (changedValues: any, _allValues: any) => {
    const allValues = filterValuesUndefined(_allValues, true);
    // 传递 flattenSchema 和 flattenData 配置给 valuesWatch
    valuesWatch(changedValues, allValues, watch, flattenSchema, flattenData);
  };

  // 扁平化 values（移除布局容器层级）
  const filterVoidContainers = (values: any) => {
    if (!flattenSchema || !values) {
      return values;
    }

    // 布局容器 widget 列表（这些 widget 只用于布局，不应该产生数据嵌套）
    const layoutWidgets = [
      'collapse',
      'boxCollapse',
      'card',
      'boxcard',
      'boxLineTitle',
      'boxSubInline',
      'lineTitle',
      'subInline',
      'box',
      'group',
      'fieldset'
    ];

    // 找出所有布局容器字段（type 为 void 或 widget 是布局组件）
    const containerPaths = Object.keys(flattenSchema).filter(key => {
      const schema = flattenSchema[key]?.schema;
      const isVoidType = schema?.type === 'void' && !schema?.bind;
      const isLayoutWidget = schema?.widget && layoutWidgets.includes(schema.widget);
      return isVoidType || isLayoutWidget;
    });

    if (containerPaths.length === 0) {
      return values;
    }

    const result = cloneDeep(values);

    // 按路径深度排序，从深到浅处理
    containerPaths.sort((a, b) => {
      const depthA = (a.match(/\./g) || []).length;
      const depthB = (b.match(/\./g) || []).length;
      return depthB - depthA;
    });

    containerPaths.forEach(containerPath => {
      // 移除 [] 标记和开头的 #
      const cleanPath = containerPath.replace(/\[\]/g, '').replace(/^#\.?/, '');
      if (!cleanPath) return;

      const pathParts = cleanPath.split('.');
      const containerKey = pathParts[pathParts.length - 1];
      const parentPath = pathParts.slice(0, -1);

      // 获取父级对象
      let parent = result;
      for (const part of parentPath) {
        if (!parent[part]) return;
        parent = parent[part];
      }

      // 如果布局容器存在且有值
      if (parent[containerKey] && typeof parent[containerKey] === 'object' && !Array.isArray(parent[containerKey])) {
        const container = parent[containerKey];
        // 将布局容器的子字段提升到父级
        Object.keys(container).forEach(childKey => {
          parent[childKey] = container[childKey];
        });
        // 删除布局容器本身
        delete parent[containerKey];
      }
    });

    return result;
  };

  const transFormValues = (_values: any) => {
    let values = cloneDeep(_values);
    values = removeHiddenData ? filterValuesHidden(values, flattenSchema) : cloneDeep(form.getFieldsValue(true));
    values = parseValuesToBind(values, flattenSchema);
    values = filterValuesUndefined(values);
    // 如果启用了 flattenData，扁平化数据
    if (flattenData) {
      values = filterVoidContainers(values);
    }
    return values;
  };

  const handleFinish = async (_values: any) => {
    const values = transFormValues(_values);
    const fieldsError = beforeFinish ? await beforeFinish({ data: values, schema, errors: [] }) : null;
    // console.log(values, form.getValues(true), _values);
    if (fieldsError?.length > 0) {
      form.setFields(fieldsError);
      return;
    }
    onSubmitLogger({ values });
    onFinish && onFinish(values, []);
  };

  const handleFinishFailed = async (params: any) => {
    const values = transFormValues(params.values);
    onSubmitLogger({ ...params, values });
    if (!onFinishFailed) {
      return;
    }
    onFinishFailed({ ...params, values });
  };

  const operlabelCol = getFormItemLayout(column, {}, { labelWidth })?.labelCol;

  const actionBtns = [];
  if (!footer?.reset?.hide) {
    actionBtns.push(
      <Button key='reset' {...footer?.reset} onClick={() => form.resetFields()}>
        {footer?.reset?.text || t('reset')}
      </Button>
    );
  }
  if (!footer?.submit?.hide) {
    actionBtns.push(
      <Button key='submit' type='primary' onClick={form.submit} {...footer?.submit}>
        {footer?.submit?.text || t('submit')}
      </Button>
    );
  }

  return (
    <Form
      className={classNames('fr-form', { [className]: !!className } )}
      labelWrap={true}
      {...formProps}
      disabled={disabled}
      form={form}
      onFinish={handleFinish}
      onFinishFailed={handleFinishFailed}
      onValuesChange={handleValuesChange}
    >
      <Row gutter={displayType === 'row' ? 16 : 24}>
        <RenderCore schema={schema} />
        {operateExtra}
      </Row>
      {schema && !!footer && (
        <Row gutter={displayType === 'row' ? 16 : 24}>
          <Col span={24 / column}>
            <Form.Item
              label={ displayType !== 'column' ?  'hideLabel' : null}
              labelCol={operlabelCol}
              className='fr-hide-label'
            >
               {isFunction(footer) ? (
                <Space>{footer(actionBtns)}</Space>
              ) : (
                <Space>{actionBtns}</Space>
              )}
            </Form.Item>
          </Col>
        </Row>
      )}
    </Form>
  );
}

export default FormCore;
