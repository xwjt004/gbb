import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Input, Space } from 'antd';
import { CloseOutlined, DragOutlined } from '@ant-design/icons';

interface CalculatorProps {
  visible: boolean;
  onClose: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ visible, onClose }) => {
  // 所有Hooks必须在条件判断之前调用
  const [display, setDisplay] = useState('0');
  const [memory, setMemory] = useState<number>(0);
  const [operator, setOperator] = useState<string>('');
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 第一个useEffect：初始化位置
  useEffect(() => {
    if (visible && !position.x && !position.y) {
      // 初始位置：右侧20%，顶部20%
      const x = window.innerWidth * 0.75 - 210; // 210是卡片宽度的一半
      const y = window.innerHeight * 0.2;
      setPosition({ x, y });
    }
  }, [visible, position]);

  // 第二个useEffect：处理拖动事件
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  // 条件渲染必须在所有Hooks之后
  if (!visible) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(String(digit));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? String(digit) : display + digit);
    }
  };

  const inputDot = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setMemory(0);
    setOperator('');
    setWaitingForOperand(false);
  };

  const clearEntry = () => {
    setDisplay('0');
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (memory === 0) {
      setMemory(inputValue);
    } else if (operator) {
      const currentValue = memory || 0;
      const newValue = calculate(currentValue, inputValue, operator);
      setDisplay(String(newValue));
      setMemory(newValue);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (left: number, right: number, op: string): number => {
    switch (op) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '×':
        return left * right;
      case '÷':
        return left / right;
      case '^':
        return Math.pow(left, right);
      default:
        return right;
    }
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);
    if (operator) {
      const newValue = calculate(memory, inputValue, operator);
      setDisplay(String(newValue));
      setMemory(0);
      setOperator('');
      setWaitingForOperand(true);
    }
  };

  const handleScientific = (func: string) => {
    const value = parseFloat(display);
    let result: number;

    switch (func) {
      case 'sin':
        result = Math.sin(value * Math.PI / 180);
        break;
      case 'cos':
        result = Math.cos(value * Math.PI / 180);
        break;
      case 'tan':
        result = Math.tan(value * Math.PI / 180);
        break;
      case 'ln':
        result = Math.log(value);
        break;
      case 'log':
        result = Math.log10(value);
        break;
      case 'sqrt':
        result = Math.sqrt(value);
        break;
      case 'x²':
        result = value * value;
        break;
      case '1/x':
        result = 1 / value;
        break;
      case 'π':
        result = Math.PI;
        break;
      case 'e':
        result = Math.E;
        break;
      default:
        result = value;
    }

    setDisplay(String(result));
    setWaitingForOperand(true);
  };

  const toggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(-value));
  };

  const handlePercent = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const buttonStyle = {
    width: '100%',
    height: '45px',
    fontSize: '16px',
  };

  const operatorStyle = {
    ...buttonStyle,
    background: '#1890ff',
    color: 'white',
    border: 'none',
  };

  const scientificStyle = {
    ...buttonStyle,
    background: '#52c41a',
    color: 'white',
    border: 'none',
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseDown={handleMouseDown}
    >
      <Card
        title={
          <div className="drag-handle" style={{ cursor: 'grab', display: 'flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}>
            <DragOutlined />
            <span>科学计算器</span>
          </div>
        }
        extra={
          <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
        }
        style={{ width: 420 }}
        styles={{ body: { padding: '12px' } }}
      >
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {/* 显示屏 */}
            <Input
              value={display}
              readOnly
              style={{
                fontSize: '28px',
                textAlign: 'right',
                marginBottom: '12px',
                height: '50px',
                fontWeight: 'bold',
              }}
            />

            {/* 科学函数行 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
              <Button style={scientificStyle} onClick={() => handleScientific('sin')}>sin</Button>
              <Button style={scientificStyle} onClick={() => handleScientific('cos')}>cos</Button>
              <Button style={scientificStyle} onClick={() => handleScientific('tan')}>tan</Button>
              <Button style={scientificStyle} onClick={() => handleScientific('ln')}>ln</Button>
              <Button style={scientificStyle} onClick={() => handleScientific('log')}>log</Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
              <Button style={scientificStyle} onClick={() => handleScientific('π')}>π</Button>
              <Button style={scientificStyle} onClick={() => handleScientific('e')}>e</Button>
              <Button style={scientificStyle} onClick={() => handleScientific('x²')}>x²</Button>
              <Button style={scientificStyle} onClick={() => performOperation('^')}>x^y</Button>
              <Button style={scientificStyle} onClick={() => handleScientific('sqrt')}>√</Button>
            </div>

            {/* 基础计算器按钮 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginTop: '8px' }}>
              <Button style={buttonStyle} onClick={clear}>C</Button>
              <Button style={buttonStyle} onClick={clearEntry}>CE</Button>
              <Button style={buttonStyle} onClick={handlePercent}>%</Button>
              <Button style={operatorStyle} onClick={() => performOperation('÷')}>÷</Button>

              <Button style={buttonStyle} onClick={() => inputDigit('7')}>7</Button>
              <Button style={buttonStyle} onClick={() => inputDigit('8')}>8</Button>
              <Button style={buttonStyle} onClick={() => inputDigit('9')}>9</Button>
              <Button style={operatorStyle} onClick={() => performOperation('×')}>×</Button>

              <Button style={buttonStyle} onClick={() => inputDigit('4')}>4</Button>
              <Button style={buttonStyle} onClick={() => inputDigit('5')}>5</Button>
              <Button style={buttonStyle} onClick={() => inputDigit('6')}>6</Button>
              <Button style={operatorStyle} onClick={() => performOperation('-')}>-</Button>

              <Button style={buttonStyle} onClick={() => inputDigit('1')}>1</Button>
              <Button style={buttonStyle} onClick={() => inputDigit('2')}>2</Button>
              <Button style={buttonStyle} onClick={() => inputDigit('3')}>3</Button>
              <Button style={operatorStyle} onClick={() => performOperation('+')}>+</Button>

              <Button style={buttonStyle} onClick={toggleSign}>+/-</Button>
              <Button style={buttonStyle} onClick={() => inputDigit('0')}>0</Button>
              <Button style={buttonStyle} onClick={inputDot}>.</Button>
              <Button
                style={{
                  ...operatorStyle,
                  background: '#ff4d4f',
                }}
                onClick={handleEquals}
              >
                =
              </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', marginTop: '4px' }}>
              <Button style={scientificStyle} onClick={() => handleScientific('1/x')}>1/x</Button>
              <Button style={scientificStyle} onClick={() => handleScientific('x²')}>x²</Button>
            </div>
          </Space>
        </Card>
      </div>
    );
  };

export default Calculator;
