import React from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { chartThemes } from '../../../config/chartThemes';
import { TrendData } from '../../../pages/Dashboard/dashboardTypes';

type ThemeKey = keyof typeof chartThemes;

interface Props {
  data: TrendData[];
  themeKey: ThemeKey;
}

export const TrendCharts: React.FC<Props> = ({ data, themeKey }) => {
  const theme = chartThemes[themeKey] || chartThemes.default;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} style={{ backgroundColor: theme.backgroundColor }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
        <XAxis dataKey="date" stroke={theme.textColor} />
        <YAxis stroke={theme.textColor} />
        <Tooltip contentStyle={{ backgroundColor: theme.tooltipBackground, color: theme.tooltipText, border: `1px solid ${theme.gridColor}` }} />
        <Legend wrapperStyle={{ color: theme.textColor }} />
        <Line type="monotone" dataKey="revenue" stroke={theme.colors[0]} name="收入" strokeWidth={2} animationDuration={1000} animationBegin={0} animationEasing="ease-in-out" />
        <Line type="monotone" dataKey="paidAmount" stroke={theme.colors[1]} name="实收" strokeWidth={2} animationDuration={1000} animationBegin={200} animationEasing="ease-in-out" />
        <Line type="monotone" dataKey="refundAmount" stroke={theme.colors[2]} name="退款" strokeWidth={2} animationDuration={1000} animationBegin={400} animationEasing="ease-in-out" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TrendCharts;
