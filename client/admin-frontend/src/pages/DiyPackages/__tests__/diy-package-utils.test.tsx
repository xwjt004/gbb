import { describe, it, expect } from 'vitest';
import { createSelectedItemFromProduct, sanitizeSelectedItems } from '../utils/diy-package-utils';

describe('diy-package-utils', () => {
  it('creates selected item from product with display fields', () => {
    const product: any = {
      id: 123,
      name: '测试商品',
      salePrice: 99.5,
      images: ['http://example.com/a.jpg'],
      brand: '品牌X',
      model: 'M1',
      category: { name: '分类A' },
      specification: '规格1',
    };

    const item = createSelectedItemFromProduct(product);
    expect(item.id).toBe(123);
    expect(item.type).toBe('product');
    expect(item.price).toBe(99.5);
    expect(item.thumbnail).toBe('http://example.com/a.jpg');
    expect(item.brand).toBe('品牌X');
    expect(item.model).toBe('M1');
    expect(item.categoryName).toBe('分类A');
    expect(item.specification).toBe('规格1');
  });

  it('sanitizes selected items to remove UI-only fields', () => {
    const items: any[] = [
      {
        id: 1,
        type: 'product',
        name: 'p1',
        price: 10,
        quantity: 1,
        subtotal: 10,
        thumbnail: 'x',
        brand: 'b',
        model: 'm',
        categoryName: 'c',
        specification: 's',
      },
    ];

    const sanitized = sanitizeSelectedItems(items as any);
    expect(sanitized[0].thumbnail).toBeUndefined();
    expect((sanitized[0] as any).brand).toBeUndefined();
    expect(sanitized[0].id).toBe(1);
  });
});
