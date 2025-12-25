import { createTransform } from 'redux-persist';

// Helper functions for BigInt serialization
const serializeBigInt = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return `__BIGINT__${obj.toString()}`;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeBigInt(obj[key]);
      }
    }
    return serialized;
  }
  
  return obj;
};

const deserializeBigInt = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string' && obj.startsWith('__BIGINT__')) {
    return BigInt(obj.slice(10)); // Remove '__BIGINT__' prefix
  }
  
  if (Array.isArray(obj)) {
    return obj.map(deserializeBigInt);
  }
  
  if (typeof obj === 'object') {
    const deserialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        deserialized[key] = deserializeBigInt(obj[key]);
      }
    }
    return deserialized;
  }
  
  return obj;
};

// Redux Persist transform for BigInt handling
export const bigIntTransform = createTransform(
  // Transform state before serialization (outbound)
  (inboundState: any) => {
    return serializeBigInt(inboundState);
  },
  // Transform state after deserialization (inbound)
  (outboundState: any) => {
    return deserializeBigInt(outboundState);
  },
  // Apply to transactionQueue only
  { whitelist: ['transactionQueue'] }
);

// Export helper functions for use in other places
export { serializeBigInt, deserializeBigInt };