import React from "react";
import {
  Drawer,
  Descriptions,
  Tag,
  Card,
  Space,
  Button,
  Image,
  Rate,
  Divider,
} from "antd";
import {
  StarOutlined,
  ShoppingCartOutlined,
  ClockCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Package } from "@/types/package";
import { Status } from "@/types/common";
import { formatImageUrl } from "@/utils/image";
import SeasonalPrices from "./SeasonalPrices";

interface PackageDetailProps {
  visible: boolean;
  pkg?: Package;
  onClose: () => void;
  onEdit?: () => void;
}

const PackageDetail: React.FC<PackageDetailProps> = ({
  visible,
  pkg,
  onClose,
  onEdit,
}) => {
  if (!pkg) return null;

  return (
    <Drawer
      title="套餐详情"
      placement="right"
      size="large"
      onClose={onClose}
      open={visible}
      extra={
        <Space>
          <Button type="primary" onClick={onEdit}>编辑</Button>
          <Button>复制</Button>
        </Space>
      }
    >
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="套餐名称" span={2}>
            <Space>
              {pkg.name}
              {pkg.isPopular && (
                <Tag color="red" icon={<StarOutlined />}>
                  热门
                </Tag>
              )}
              <Tag color={pkg.status === Status.ACTIVE ? "green" : "red"}>
                {pkg.status === Status.ACTIVE ? "上架" : "下架"}
              </Tag>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="套餐价格">
            <Space>
              <span
                style={{ fontSize: "18px", color: "#f50", fontWeight: "bold" }}
              >
                ¥{Number(pkg.price || 0).toFixed(2)}
              </span>
              {pkg.originalPrice && Number(pkg.originalPrice || 0) > Number(pkg.price || 0) && (
                <span style={{ textDecoration: "line-through", color: "#999" }}>
                  ¥{Number(pkg.originalPrice || 0).toFixed(2)}
                </span>
              )}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="服务时长">
            <Space>
              <ClockCircleOutlined />
              {pkg.duration} 分钟
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="套餐分类">{pkg.category}</Descriptions.Item>
          <Descriptions.Item label="最大预订数">
            {pkg.maxBookings}
          </Descriptions.Item>
          <Descriptions.Item label="订单数量">
            <Space>
              <ShoppingCartOutlined />
              {pkg.orderCount} 次
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="套餐评分">
            <Space>
              <Rate disabled value={Number(pkg.rating || 0)} />
              <span>{Number(pkg.rating || 0).toFixed(1)}</span>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="套餐描述" span={2}>
            {pkg.description || "-"}
          </Descriptions.Item>
        </Descriptions>

        {/* 标签 */}
        {pkg.tags?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 500, marginBottom: 8, color: '#666', fontSize: 13 }}>标签</div>
            <Space wrap>
              {pkg.tags.map((tag, index) => (
                <Tag key={index} color="blue">{tag}</Tag>
              ))}
            </Space>
          </div>
        )}

        {/* 服务内容 */}
        {(pkg.packageServices?.length > 0 || pkg.services?.length > 0) && (
          <>
            <Divider />
            <div style={{ fontWeight: 500, marginBottom: 12, fontSize: 15 }}>服务内容</div>
            {pkg.packageServices?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pkg.packageServices.map((ps: any) => (
                  <div
                    key={ps.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      background: '#fafafa',
                      borderRadius: 6,
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    {ps.service?.images?.[0] && (
                      <Image
                        src={formatImageUrl(ps.service.images[0])}
                        width={56}
                        height={56}
                        style={{ objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                        preview={false}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{ps.service?.name}</div>
                      {ps.service?.category && (
                        <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>{ps.service.category}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ color: '#f50', fontWeight: 600, fontSize: 14 }}>
                        ¥{Number(ps.service?.basePrice ?? 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {pkg.services.map((item: string, i: number) => (
                  <Tag key={i} color="purple">{item}</Tag>
                ))}
              </div>
            )}
          </>
        )}

        {/* 商品内容 */}
        {pkg.packageProducts?.length > 0 && (
          <>
            <Divider />
            <div style={{ fontWeight: 500, marginBottom: 12, fontSize: 15 }}>商品内容</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pkg.packageProducts.map((pp: any) => (
                <div
                  key={pp.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    background: '#fafafa',
                    borderRadius: 6,
                    border: '1px solid #f0f0f0',
                  }}
                >
                  {pp.product?.images?.[0] && (
                    <Image
                      src={formatImageUrl(pp.product.images[0])}
                      width={56}
                      height={56}
                      style={{ objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                      preview={false}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{pp.product?.name}</div>
                    {pp.product?.specification && (
                      <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>规格：{pp.product.specification}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: '#f50', fontWeight: 600, fontSize: 14 }}>
                      ¥{Number(pp.product?.salePrice ?? 0).toFixed(2)}
                    </div>
                    <div style={{ color: '#999', fontSize: 12 }}>× {pp.quantity}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* 促销信息 */}
      {(pkg as any).promotionPrice && (
        <Card title="限时促销" style={{ marginBottom: 16 }}>
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="促销价">
              <span style={{ color: '#f50', fontWeight: 'bold', fontSize: 16 }}>
                ¥{Number((pkg as any).promotionPrice).toFixed(2)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="促销时间">
              {(pkg as any).promotionStart && (pkg as any).promotionEnd
                ? `${new Date((pkg as any).promotionStart).toLocaleDateString()} ~ ${new Date((pkg as any).promotionEnd).toLocaleDateString()}`
                : '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* 团购信息 */}
      {(pkg as any).groupMinCount && (pkg as any).groupMinCount > 0 && (
        <Card title="团购优惠" style={{ marginBottom: 16 }}>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="成团人数">
              <TeamOutlined /> {(pkg as any).groupMinCount} 人
            </Descriptions.Item>
            <Descriptions.Item label="团购价">
              <span style={{ color: '#f50', fontWeight: 'bold' }}>
                ¥{Number((pkg as any).groupPrice).toFixed(2)}
              </span>
            </Descriptions.Item>
            {(pkg as any).groupBuyDescription && (
              <Descriptions.Item label="团购说明" span={1}>
                {(pkg as any).groupBuyDescription}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      {/* 团购海报设置 */}
      {((pkg as any).posterTitle || (pkg as any).posterContent || (pkg as any).posterBackground || ((pkg as any).posterImages?.length > 0)) && (
        <Card title="团购海报设置" style={{ marginBottom: 16 }}>
          <Descriptions column={1} bordered size="small">
            {(pkg as any).posterTitle && (
              <Descriptions.Item label="海报标题">{(pkg as any).posterTitle}</Descriptions.Item>
            )}
            {(pkg as any).posterContent && (
              <Descriptions.Item label="海报描述">{(pkg as any).posterContent}</Descriptions.Item>
            )}
            {(pkg as any).posterBackground && (
              <Descriptions.Item label="海报背景">{(pkg as any).posterBackground}</Descriptions.Item>
            )}
            {(pkg as any).posterImages?.length > 0 && (
              <Descriptions.Item label="宣传照片">
                <Image.PreviewGroup>
                  <Space wrap>
                    {(pkg as any).posterImages.map((url: string, index: number) => (
                      <Image
                        key={index}
                        width={80}
                        height={80}
                        src={formatImageUrl(url)}
                        style={{ objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      {/* 季节性价格 */}
      {(pkg as any).id && (
        <Card title="价格日历" style={{ marginBottom: 16 }}>
          <SeasonalPrices packageId={(pkg as any).id} />
        </Card>
      )}

      {pkg.images && pkg.images.length > 0 && (
        <Card title="套餐图片">
          <Image.PreviewGroup>
            <Space wrap>
              {pkg.images.map((image, index) => (
                <Image
                  key={index}
                  width={120}
                  height={120}
                  src={formatImageUrl(image)}
                  style={{ objectFit: "cover", borderRadius: "8px" }}
                />
              ))}
            </Space>
          </Image.PreviewGroup>
        </Card>
      )}
    </Drawer>
  );
};

export default PackageDetail;
