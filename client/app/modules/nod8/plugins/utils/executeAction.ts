export const executeAction = async (
  executePlugin: (
    pluginId: string,
    method: string,
    params: any,
  ) => Promise<any>,
  pluginId: string,
  method: string,
  params: Record<string, any>,
  row: any,
) => {
  const resolved = resolveParams(params, row);

  return await executePlugin(pluginId, method, resolved);
};

const resolveParams = (params: Record<string, any>, row: any) => {
  const resolved: Record<string, any> = {};

  for (const key in params) {
    const value = params[key];

    const match = value.match(/{{(.*?)}}/);

    if (match) {
      const field = match[1];
      resolved[key] = row[field];
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
};
