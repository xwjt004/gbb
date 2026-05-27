import type { Product, ServiceItem } from '@/types/product';
import type { SelectedItem } from '@/types/diy-package';

export function createSelectedItemFromProduct(product: Product): SelectedItem {
  // 价格可能是字符串或数字，统一转换为数字
  const price = typeof product.salePrice === 'number' 
    ? product.salePrice 
    : (typeof product.salePrice === 'string' ? parseFloat(product.salePrice) : 0);
  return {
    id: product.id,
    type: 'product',
    name: product.name,
    price,
    quantity: 1,
    subtotal: price,
    thumbnail: product.images && product.images.length > 0 ? product.images[0] : undefined,
    brand: product.brand,
    model: product.model,
    categoryName: product.category?.name,
    specification: product.specification,
  };
}

export function createSelectedItemFromService(service: ServiceItem): SelectedItem {
  // 价格可能是字符串或数字，统一转换为数字
  const price = typeof service.basePrice === 'number' 
    ? service.basePrice 
    : (typeof service.basePrice === 'string' ? parseFloat(service.basePrice) : 0);
  return {
    id: service.id,
    type: 'service',
    name: service.name,
    price,
    quantity: 1,
    subtotal: price,
    thumbnail: service.images && service.images.length > 0 ? service.images[0] : undefined,
    brand: (service as any).brand,
    model: (service as any).model,
    categoryName: (service as any).category || undefined,
    specification: (service as any).specification,
  };
}

export function sanitizeSelectedItems(items: SelectedItem[]) {
  return items.map(it => {
    const { thumbnail, brand, model, categoryName, specification, ...rest } = it as any;
    return rest as SelectedItem;
  });
}

export default {
  createSelectedItemFromProduct,
  createSelectedItemFromService,
  sanitizeSelectedItems,
};
