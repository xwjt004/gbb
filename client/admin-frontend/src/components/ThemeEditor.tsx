import React, { useState } from 'react';
import { Row, Col, Card, Button, Space, Popover } from 'antd';
import { SketchPicker, ColorResult } from 'react-color';
import { ChartTheme } from '../config/chartThemes';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ThemeEditorProps {
  theme: ChartTheme;
  onThemeChange: (theme: ChartTheme) => void;
}

const previewData = [
  { name: '01', value1: 100, value2: 80, value3: 60 },
  { name: '02', value1: 85, value2: 90, value3: 75 },
  { name: '03', value1: 120, value2: 100, value3: 90 },
  { name: '04', value1: 75, value2: 85, value3: 95 },
];

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  title: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, title }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      content={
        <SketchPicker
          color={color}
          onChange={(color: ColorResult) => onChange(color.hex)}
        />
      }
      trigger="click"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <div style={{ cursor: 'pointer' }}>
        <div style={{ marginBottom: 4 }}>{title}</div>
        <div
          style={{
            backgroundColor: color,
            width: '100%',
            height: 32,
            borderRadius: 4,
            border: '1px solid #d9d9d9',
          }}
        />
      </div>
    </Popover>
  );
};

export const ThemeEditor: React.FC<ThemeEditorProps> = ({
  theme,
  onThemeChange,
}) => {
  const updateTheme = (updates: Partial<ChartTheme>) => {
    onThemeChange({ ...theme, ...updates });
  };

  return (
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <Card title="主题预览" style={{ marginBottom: 16 }}>
          <div style={{ 
            backgroundColor: theme.backgroundColor,
            padding: 16,
            borderRadius: 8
          }}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={previewData}>
                <CartesianGrid stroke={theme.gridColor} />
                <XAxis 
                  dataKey="name" 
                  stroke={theme.textColor}
                />
                <YAxis 
                  stroke={theme.textColor}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.tooltipBackground,
                    color: theme.tooltipText,
                    border: `1px solid ${theme.gridColor}`,
                  }}
                />
                <Legend
                  wrapperStyle={{
                    color: theme.textColor,
                  }}
                />
                {theme.colors.slice(0, 3).map((color, index) => (
                  <Line
                    key={index}
                    type="monotone"
                    dataKey={`value${index + 1}`}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ fill: color }}
                    name={`数据${index + 1}`}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="颜色配置">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <ColorPicker
                color={theme.backgroundColor}
                onChange={(color) => updateTheme({ backgroundColor: color })}
                title="背景颜色"
              />
            </Col>
            <Col span={12}>
              <ColorPicker
                color={theme.textColor}
                onChange={(color) => updateTheme({ textColor: color })}
                title="文字颜色"
              />
            </Col>
            <Col span={12}>
              <ColorPicker
                color={theme.gridColor}
                onChange={(color) => updateTheme({ gridColor: color })}
                title="网格颜色"
              />
            </Col>
            <Col span={12}>
              <ColorPicker
                color={theme.tooltipBackground}
                onChange={(color) => updateTheme({ tooltipBackground: color })}
                title="提示框背景"
              />
            </Col>
          </Row>
        </Card>
      </Col>

      <Col span={12}>
        <Card title="图表颜色">
          <Row gutter={[16, 16]}>
            {theme.colors.map((color, index) => (
              <Col span={12} key={index}>
                <ColorPicker
                  color={color}
                  onChange={(newColor) => {
                    const newColors = [...theme.colors];
                    newColors[index] = newColor;
                    updateTheme({ colors: newColors });
                  }}
                  title={`颜色 ${index + 1}`}
                />
              </Col>
            ))}
          </Row>
        </Card>

        <Card title="操作" style={{ marginTop: 16 }}>
          <Space>
            <Button onClick={() => {
              const savedTheme = localStorage.getItem('custom_chart_theme');
              if (savedTheme) {
                onThemeChange(JSON.parse(savedTheme));
              }
            }}>
              恢复上次保存
            </Button>
            <Button type="primary" onClick={() => {
              localStorage.setItem('custom_chart_theme', JSON.stringify(theme));
            }}>
              保存主题
            </Button>
          </Space>
        </Card>
      </Col>
    </Row>
  );
};
