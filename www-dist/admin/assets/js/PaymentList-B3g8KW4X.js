import{j as e,o as Pe}from"./index-4Bb4C75y.js";import{r as p}from"./react-o6zXO7vr.js";import{p as k}from"./payments-IlYyB4fo.js";import{H as L,g as Ce,C,h as o,a2 as se,I as X,a0 as c,D as Be,T as w,a9 as Ee,S as U,B as I,ae as He,aC as Re,Z as G,af as Z,ag as ae,t as Y,aa as Fe,$ as J,Q,U as P,as as H,aD as Ne,Y as Ue,au as Se,az as le,a8 as Ye,aE as we,ah as ie,aF as Ke,aG as Ve,aH as qe}from"./antd-CBpwwMvw.js";import"./vendor_misc-NIGUFBhG.js";var l=(d=>(d.PENDING_PAYMENT="PENDING_PAYMENT",d.PARTIAL_PAID="PARTIAL_PAID",d.PAID="PAID",d.PENDING="PENDING",d.PROCESSING="PROCESSING",d.FAILED="FAILED",d.REFUNDING="REFUNDING",d.REFUNDED="REFUNDED",d.CANCELLED="CANCELLED",d))(l||{}),y=(d=>(d.WECHAT="WECHAT",d.ALIPAY="ALIPAY",d.CASH="CASH",d.BANK_TRANSFER="BANK_TRANSFER",d))(y||{});const{TextArea:Me}=X,Qe=({visible:d,payment:n,onCancel:T,onSuccess:b})=>{const[E]=L.useForm(),[R,m]=p.useState(!1),g=async()=>{if(n)try{const f=await E.validateFields();m(!0);const z={paymentId:n.id,amount:f.amount,reason:f.reason,notes:f.notes};await k.processRefund(z),c.success("退款申请提交成功"),b()}catch{c.error("退款申请失败")}finally{m(!1)}};if(!n)return null;const a=n.amount-n.refundAmount;return e.jsxs(Ce,{title:"申请退款",open:d,onCancel:T,onOk:g,confirmLoading:R,destroyOnHidden:!0,children:[e.jsx(C,{title:"支付信息",size:"small",style:{marginBottom:16},children:e.jsxs(o,{column:2,size:"small",children:[e.jsx(o.Item,{label:"支付单号",children:n.paymentNo}),e.jsxs(o.Item,{label:"支付金额",children:["¥",Number(n.amount||0).toFixed(2)]}),e.jsxs(o.Item,{label:"已退款金额",children:["¥",Number(n.refundAmount||0).toFixed(2)]}),e.jsxs(o.Item,{label:"可退款金额",children:["¥",Number(a||0).toFixed(2)]})]})}),e.jsxs(L,{form:E,layout:"vertical",initialValues:{amount:a},children:[e.jsx(L.Item,{name:"amount",label:"退款金额",rules:[{required:!0,message:"请输入退款金额"},{type:"number",min:.01,max:Number(a||0),message:`退款金额应在 0.01 - ${Number(a||0).toFixed(2)} 之间`}],children:e.jsx(se,{style:{width:"100%"},precision:2,max:a,min:.01,step:.01,addonBefore:"¥"})}),e.jsx(L.Item,{name:"reason",label:"退款原因",rules:[{required:!0,message:"请输入退款原因"}],children:e.jsx(X,{placeholder:"请输入退款原因"})}),e.jsx(L.Item,{name:"notes",label:"备注说明",children:e.jsx(Me,{rows:3,placeholder:"请输入备注说明"})})]})]})},Ze=({visible:d,payment:n,onClose:T})=>{var m,g,a,f,z;if(!n)return null;const b={[l.PENDING_PAYMENT]:{color:"orange",text:"待支付",icon:e.jsx(Y,{})},[l.PARTIAL_PAID]:{color:"blue",text:"部分支付",icon:e.jsx(Y,{})},[l.PENDING]:{color:"orange",text:"待支付",icon:e.jsx(Y,{})},[l.PROCESSING]:{color:"blue",text:"处理中",icon:e.jsx(G,{spin:!0})},[l.PAID]:{color:"green",text:"支付成功",icon:e.jsx(ae,{})},[l.FAILED]:{color:"red",text:"支付失败",icon:e.jsx(Z,{})},[l.CANCELLED]:{color:"default",text:"已取消",icon:e.jsx(Z,{})},[l.REFUNDING]:{color:"orange",text:"退款中",icon:e.jsx(G,{spin:!0})},[l.REFUNDED]:{color:"purple",text:"已退款",icon:e.jsx(Re,{})}},E={[y.WECHAT]:"微信支付",[y.ALIPAY]:"支付宝",[y.CASH]:"现金",[y.BANK_TRANSFER]:"银行卡"},R=()=>{var $,F,N,x,A;if(!n)return;const W=`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>支付凭证 - ${n.paymentNo}</title>
        <style>
          body { 
            font-family: "Microsoft YaHei", Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.6;
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #1890ff;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #1890ff;
            margin: 0;
            font-size: 28px;
          }
          .header h2 {
            color: #666;
            margin: 10px 0 0 0;
            font-size: 18px;
            font-weight: normal;
          }
          .section { 
            margin-bottom: 25px; 
            page-break-inside: avoid;
          }
          .section-title { 
            font-weight: bold; 
            font-size: 16px;
            margin-bottom: 15px; 
            border-bottom: 1px solid #d9d9d9; 
            padding-bottom: 8px;
            color: #1890ff;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          .info-row { 
            margin: 10px 0; 
            padding: 8px;
            background: #fafafa;
            border-radius: 4px;
          }
          .label { 
            font-weight: bold; 
            display: inline-block; 
            width: 120px; 
            color: #666;
          }
          .value {
            color: #333;
          }
          .amount {
            font-size: 18px;
            font-weight: bold;
            color: #f5222d;
          }
          .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }
          .status-success { background-color: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
          .status-pending { background-color: #fff7e6; color: #fa8c16; border: 1px solid #ffd591; }
          .status-failed { background-color: #fff2f0; color: #ff4d4f; border: 1px solid #ffccc7; }
          .status-refunded { background-color: #f9f0ff; color: #722ed1; border: 1px solid #d3adf7; }
          .timeline {
            margin: 15px 0;
          }
          .timeline-item {
            margin: 10px 0;
            padding: 8px 0;
            border-left: 2px solid #1890ff;
            padding-left: 15px;
          }
          .timeline-time {
            font-size: 12px;
            color: #999;
          }
          .footer { 
            margin-top: 40px; 
            text-align: center; 
            font-size: 12px; 
            color: #999; 
            border-top: 1px solid #d9d9d9;
            padding-top: 20px;
          }
          .qr-note {
            background: #e6f7ff;
            border: 1px solid #91d5ff;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
          }
          @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎈 乖宝宝儿童影楼</h1>
          <h2>支付凭证</h2>
        </div>
        
        <div class="section">
          <div class="section-title">💳 支付信息</div>
          <div class="info-grid">
            <div class="info-row">
              <span class="label">支付单号:</span>
              <span class="value" style="font-family: monospace; font-weight: bold;">${n.paymentNo}</span>
            </div>
            <div class="info-row">
              <span class="label">支付状态:</span>
              <span class="status ${K(n.status)}">${($=b[n.status])==null?void 0:$.text}</span>
            </div>
            <div class="info-row">
              <span class="label">支付方式:</span>
              <span class="value">${n.method?E[n.method]:"未支付"}</span>
            </div>
            <div class="info-row">
              <span class="label">创建时间:</span>
              <span class="value">${new Date(n.createdAt).toLocaleString()}</span>
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-row">
              <span class="label">支付金额:</span>
              <span class="amount">¥${Number(n.amount||0).toFixed(2)}</span>
            </div>
            <div class="info-row">
              <span class="label">实付金额:</span>
              <span class="amount">¥${Number(n.actualAmount||0).toFixed(2)}</span>
            </div>
            ${Number(n.refundAmount||0)>0?`
            <div class="info-row">
              <span class="label">退款金额:</span>
              <span class="value" style="color: #f5222d;">¥${Number(n.refundAmount||0).toFixed(2)}</span>
            </div>
            `:""}
            ${n.thirdPartyId?`
            <div class="info-row">
              <span class="label">第三方交易号:</span>
              <span class="value" style="font-family: monospace; font-size: 12px;">${n.thirdPartyId}</span>
            </div>
            `:""}
          </div>
          
          ${n.processedAt?`
          <div class="info-row">
            <span class="label">支付时间:</span>
            <span class="value">${new Date(n.processedAt).toLocaleString()}</span>
          </div>
          `:""}
          
          ${n.notes?`
          <div class="info-row" style="grid-column: span 2;">
            <span class="label">备注:</span>
            <span class="value">${n.notes}</span>
          </div>
          `:""}
        </div>
        
        <div class="section">
          <div class="section-title">📋 关联订单信息</div>
          <div class="info-grid">
            <div class="info-row">
              <span class="label">订单号:</span>
              <span class="value" style="font-family: monospace; font-weight: bold;">${((F=n.order)==null?void 0:F.orderNo)||"-"}</span>
            </div>
            <div class="info-row">
              <span class="label">客户手机:</span>
              <span class="value">${((N=n.user)==null?void 0:N.phone)||"-"}</span>
            </div>
            ${(x=n.user)!=null&&x.nickname?`
            <div class="info-row">
              <span class="label">客户昵称:</span>
              <span class="value">${n.user.nickname}</span>
            </div>
            `:""}
            ${(A=n.order)!=null&&A.totalAmount?`
            <div class="info-row">
              <span class="label">订单总额:</span>
              <span class="value">¥${Number(n.order.totalAmount).toFixed(2)}</span>
            </div>
            `:""}
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">⏰ 操作记录</div>
          <div class="timeline">
            <div class="timeline-item">
              <div>💡 支付单创建</div>
              <div class="timeline-time">${new Date(n.createdAt).toLocaleString()}</div>
            </div>
            ${n.processedAt?`
            <div class="timeline-item">
              <div>✅ 支付完成</div>
              <div class="timeline-time">${new Date(n.processedAt).toLocaleString()}</div>
            </div>
            `:""}
            ${n.refundedAt?`
            <div class="timeline-item">
              <div>↩️ 退款完成</div>
              <div class="timeline-time">${new Date(n.refundedAt).toLocaleString()}</div>
            </div>
            `:""}
          </div>
        </div>
        
        ${n.refundReason?`
        <div class="section">
          <div class="section-title">📝 退款信息</div>
          <div class="info-row">
            <span class="label">退款原因:</span>
            <span class="value">${n.refundReason}</span>
          </div>
        </div>
        `:""}
        
        <div class="qr-note">
          <strong>🔍 支付凭证查询</strong><br>
          如有疑问，请联系客服或访问门店进行查询核实<br>
          支付单号: ${n.paymentNo}
        </div>
        
        <div class="footer">
          <p><strong>打印时间:</strong> ${new Date().toLocaleString()}</p>
          <p>🎈 乖宝宝儿童影楼 - 记录每一个美好瞬间</p>
          <p>📍 地址: [门店地址] | 📞 电话: [客服电话] | 🌐 官网: [官方网站]</p>
          <p style="margin-top: 15px; font-size: 10px; color: #ccc;">
            此凭证为系统自动生成，具有法律效力。如有争议，请以系统记录为准。
          </p>
        </div>
      </body>
      </html>
    `;function K(D){switch(D){case l.PAID:return"status-success";case l.PENDING:case l.PROCESSING:return"status-pending";case l.FAILED:case l.CANCELLED:return"status-failed";case l.REFUNDED:case l.REFUNDING:return"status-refunded";default:return"status-pending"}}const v=window.open("","_blank");v?(v.document.write(W),v.document.close(),v.onload=()=>{v.focus(),v.print(),v.onafterprint=()=>{v.close()}},c.success("支付凭证准备完成，请确认打印")):c.error("无法打开打印窗口，请检查浏览器设置")};return e.jsxs(Be,{title:"支付详情",placement:"right",size:"large",onClose:T,open:d,extra:e.jsx(U,{children:e.jsx(I,{type:"primary",icon:e.jsx(He,{}),onClick:R,children:"打印凭证"})}),children:[e.jsx(C,{title:"支付信息",style:{marginBottom:16},children:e.jsxs(o,{column:2,bordered:!0,children:[e.jsx(o.Item,{label:"支付单号",span:2,children:e.jsx("span",{style:{fontFamily:"monospace",fontWeight:"bold"},children:n.paymentNo})}),e.jsx(o.Item,{label:"支付状态",children:e.jsx(w,{color:(m=b[n.status])==null?void 0:m.color,icon:(g=b[n.status])==null?void 0:g.icon,children:(a=b[n.status])==null?void 0:a.text})}),e.jsx(o.Item,{label:"支付方式",children:n.method?E[n.method]:"未支付"}),e.jsx(o.Item,{label:"支付金额",children:e.jsxs("span",{style:{fontSize:"16px",fontWeight:"bold",color:"#f50"},children:["¥",Number(n.amount||0).toFixed(2)]})}),e.jsx(o.Item,{label:"实付金额",children:e.jsxs("span",{style:{fontSize:"16px",fontWeight:"bold"},children:["¥",Number(n.actualAmount||0).toFixed(2)]})}),e.jsx(o.Item,{label:"第三方交易号",children:n.thirdPartyId||"-"}),e.jsx(o.Item,{label:"支付时间",children:n.processedAt?new Date(n.processedAt).toLocaleString():"-"}),e.jsxs(o.Item,{label:"退款金额",children:["¥",Number(n.refundAmount||0).toFixed(2)]}),e.jsx(o.Item,{label:"退款原因",children:n.refundReason||"-"}),e.jsx(o.Item,{label:"备注",span:2,children:n.notes||"-"})]})}),e.jsx(C,{title:"关联订单信息",style:{marginBottom:16},children:e.jsxs(o,{column:2,children:[e.jsx(o.Item,{label:"订单号",children:((f=n.order)==null?void 0:f.orderNo)||"-"}),e.jsx(o.Item,{label:"用户手机号",children:((z=n.user)==null?void 0:z.phone)||"-"})]})}),e.jsx(C,{title:"操作记录",children:e.jsx(Ee,{items:[{color:"blue",children:e.jsxs("div",{children:["支付单创建",e.jsx("div",{style:{fontSize:"12px",color:"#666"},children:new Date(n.createdAt).toLocaleString()})]})},...n.processedAt?[{color:"green",children:e.jsxs("div",{children:["支付完成",e.jsx("div",{style:{fontSize:"12px",color:"#666"},children:new Date(n.processedAt).toLocaleString()})]})}]:[],...n.refundedAt?[{color:"red",children:e.jsxs("div",{children:["退款完成",e.jsx("div",{style:{fontSize:"12px",color:"#666"},children:new Date(n.refundedAt).toLocaleString()})]})}]:[]]})})]})},{Option:te}=J,{TextArea:Je}=X,Xe=({visible:d,onCancel:n,onSuccess:T})=>{var F,N;const[b]=L.useForm(),[E,R]=p.useState(!1),[m,g]=p.useState(!1),[a,f]=p.useState(null),z=()=>{b.resetFields(),f(null)},W=async x=>{if(!x.trim()){f(null);return}try{g(!0);const A=await Pe.getOrderByOrderNo(x);f(A.data);const D=Number(A.data.totalAmount)-Number(A.data.paidAmount||0);b.setFieldValue("amount",D)}catch{c.error("订单不存在或查询失败"),f(null)}finally{g(!1)}},K=async()=>{var x;if(!a){c.error("请先搜索并选择订单");return}try{const A=await b.validateFields();R(!0);const D={orderNo:a.orderNo,amount:A.amount,paymentType:A.method,description:A.notes||`${(x=a.package)==null?void 0:x.name} - 支付`};await k.createPayment(D),c.success("支付记录创建成功"),T(),z()}catch{c.error("创建支付记录失败")}finally{R(!1)}},v=()=>{z(),n()},$=a?Number(a.totalAmount)-Number(a.paidAmount||0):0;return e.jsxs(Ce,{title:"创建支付记录",open:d,onCancel:v,onOk:K,confirmLoading:E,width:800,destroyOnHidden:!0,children:[e.jsxs(L,{form:b,layout:"vertical",initialValues:{method:y.CASH},children:[e.jsx(L.Item,{name:"orderNo",label:"订单号",rules:[{required:!0,message:"请输入订单号"}],children:e.jsx(X,{placeholder:"请输入订单号进行搜索",onBlur:x=>W(x.target.value),suffix:e.jsx("div",{style:{minWidth:14,height:14,display:"flex",alignItems:"center",justifyContent:"center"},children:m?e.jsx(Fe,{size:"small"}):null})})}),a&&e.jsx(C,{title:"订单信息",size:"small",style:{marginBottom:16},children:e.jsxs(o,{column:2,size:"small",children:[e.jsx(o.Item,{label:"订单号",children:a.orderNo}),e.jsx(o.Item,{label:"客户手机号",children:(F=a.user)==null?void 0:F.phone}),e.jsx(o.Item,{label:"套餐名称",children:(N=a.package)==null?void 0:N.name}),e.jsxs(o.Item,{label:"订单总额",children:["¥",Number(a.totalAmount||0).toFixed(2)]}),e.jsxs(o.Item,{label:"已支付金额",children:["¥",Number(a.paidAmount||0).toFixed(2)]}),e.jsx(o.Item,{label:"待支付金额",children:e.jsxs("span",{style:{color:"#f50",fontWeight:"bold"},children:["¥",$.toFixed(2)]})})]})}),e.jsx(L.Item,{name:"method",label:"支付方式",rules:[{required:!0,message:"请选择支付方式"}],children:e.jsxs(J,{placeholder:"请选择支付方式",children:[e.jsx(te,{value:y.CASH,children:"现金支付"}),e.jsx(te,{value:y.WECHAT,children:"微信支付"}),e.jsx(te,{value:y.BANK_TRANSFER,children:"银行卡支付"}),e.jsx(te,{value:y.ALIPAY,children:"支付宝"})]})}),e.jsx(L.Item,{name:"amount",label:"支付金额",rules:[{required:!0,message:"请输入支付金额"},{type:"number",min:.01,max:$||999999,message:`支付金额应在 0.01 - ${$.toFixed(2)} 之间`}],children:e.jsx(se,{style:{width:"100%"},precision:2,max:$,min:.01,step:.01,addonBefore:"¥",placeholder:"请输入支付金额"})}),e.jsx(L.Item,{name:"notes",label:"备注说明",children:e.jsx(Je,{rows:3,placeholder:"请输入备注说明（可选）"})})]}),a&&e.jsx("div",{style:{marginTop:16,padding:12,backgroundColor:"#f6f6f6",borderRadius:4},children:e.jsxs(U,{direction:"vertical",style:{width:"100%"},children:[e.jsx("div",{children:e.jsx("strong",{children:"温馨提示："})}),e.jsx("div",{children:'• 现金支付：创建后支付状态为"已支付"'}),e.jsx("div",{children:"• 微信/支付宝：创建后需要客户完成支付流程"}),e.jsx("div",{children:"• 银行卡支付：创建后需要手动确认到账"})]})})]})},{Search:et}=X,{Option:De}=J,{RangePicker:tt}=Ue,it=()=>{const[d,n]=p.useState([]),[T,b]=p.useState(!1),[E,R]=p.useState({}),[m,g]=p.useState({current:1,pageSize:20,total:0}),[a,f]=p.useState([]),[z,W]=p.useState(!1),[K,v]=p.useState(!1),[$,F]=p.useState(),N=t=>t.startsWith("UNPAID_")||t.startsWith("PENDING_"),[x,A]=p.useState({totalPayments:0,successPayments:0,failedPayments:0,pendingPayments:0,totalAmount:0,todayAmount:0,refundAmount:0,conversionRate:0});p.useEffect(()=>{D(),ne()},[m.current,m.pageSize,E]);const D=async()=>{b(!0);try{const t=await k.getPayments({page:m.current,pageSize:m.pageSize,...E});n(t.data.list),g({...m,total:t.data.pagination.total})}catch{c.error("加载支付列表失败")}finally{b(!1)}},ne=async()=>{try{const t=await k.getPaymentStats();A(t.data)}catch(t){console.error("加载统计数据失败:",t)}},O={[l.PENDING_PAYMENT]:{color:"orange",text:"待支付",icon:e.jsx(Y,{})},[l.PARTIAL_PAID]:{color:"blue",text:"部分支付",icon:e.jsx(G,{spin:!0})},[l.PENDING]:{color:"orange",text:"待支付",icon:e.jsx(Y,{})},[l.PROCESSING]:{color:"blue",text:"处理中",icon:e.jsx(G,{spin:!0})},[l.PAID]:{color:"green",text:"支付成功",icon:e.jsx(ae,{})},[l.FAILED]:{color:"red",text:"支付失败",icon:e.jsx(Z,{})},[l.CANCELLED]:{color:"default",text:"已取消",icon:e.jsx(Z,{})},[l.REFUNDING]:{color:"orange",text:"退款中",icon:e.jsx(G,{spin:!0})},[l.REFUNDED]:{color:"purple",text:"已退款",icon:e.jsx(Re,{})}},_={[y.WECHAT]:{color:"green",text:"微信支付"},[y.ALIPAY]:{color:"blue",text:"支付宝"},[y.CASH]:{color:"orange",text:"现金"},[y.BANK_TRANSFER]:{color:"purple",text:"银行卡"}},Le=[{title:"支付信息",key:"paymentInfo",width:200,render:(t,s)=>e.jsxs("div",{children:[e.jsx("div",{style:{fontFamily:"monospace",fontWeight:"bold"},children:s.paymentNo}),e.jsx("div",{style:{color:"#666",fontSize:"12px"},children:new Date(s.createdAt).toLocaleString()})]})},{title:"关联订单",dataIndex:["order","orderNo"],width:150,render:(t,s)=>{var u;return e.jsxs("div",{children:[e.jsx("div",{style:{fontFamily:"monospace"},children:t}),e.jsx("div",{style:{color:"#666",fontSize:"12px"},children:(u=s.user)==null?void 0:u.phone})]})}},{title:"金额信息",key:"amount",width:150,render:(t,s)=>{var q,M;const u=N(s.id),j=Number(((q=s.order)==null?void 0:q.totalAmount)||0),i=Number(((M=s.order)==null?void 0:M.paidAmount)||0),r=Number(s.amount||0),S=r<0,B=Math.max(0,j-i);return e.jsxs("div",{children:[e.jsxs("div",{style:{fontWeight:"bold",color:S?"#ff4d4f":"#f50"},children:[S?"已退: ":u?"定金: ":"已付: ","¥",Math.abs(r).toFixed(2)]}),e.jsxs("div",{style:{color:"#666",fontSize:"12px"},children:["总额: ¥",j.toFixed(2)]}),!S&&B>0&&e.jsxs("div",{style:{color:"#ff4d4f",fontSize:"12px"},children:["未收: ¥",B.toFixed(2)]}),!S&&B<=0&&e.jsx("div",{style:{color:"#52c41a",fontSize:"12px"},children:"已付清"}),Number(s.refundAmount||0)>0&&e.jsxs("div",{style:{color:"#999",fontSize:"12px"},children:["已退款: ¥",Number(s.refundAmount||0).toFixed(2)]})]})}},{title:"支付方式",dataIndex:"method",width:110,render:t=>{if(!t)return e.jsx(w,{color:"default",children:"未支付"});const s=_[t];return e.jsx(w,{color:s==null?void 0:s.color,children:s==null?void 0:s.text})}},{title:"支付状态",dataIndex:"status",width:120,render:t=>{const s=O[t];return e.jsx(w,{color:s==null?void 0:s.color,icon:s==null?void 0:s.icon,children:s==null?void 0:s.text})}},{title:"第三方交易号",dataIndex:"thirdPartyId",width:150,render:t=>t?e.jsx("span",{style:{fontFamily:"monospace",fontSize:"12px"},children:t}):"-"},{title:"操作",key:"action",width:200,render:(t,s)=>{const u=N(s.id);return e.jsxs(U,{size:"small",children:[e.jsx(I,{type:"link",onClick:()=>ke(s),children:"详情"}),u?e.jsx(le,{title:"确认收到现金支付？",description:"这将为该订单创建现金支付记录",onConfirm:()=>ce(s.id),children:e.jsx(I,{type:"link",style:{color:"#52c41a"},children:"收款"})}):e.jsxs(e.Fragment,{children:[s.status===l.PENDING&&e.jsx(le,{title:"确认支付成功？",onConfirm:()=>ce(s.id),children:e.jsx(I,{type:"link",children:"确认"})}),s.status===l.PAID&&e.jsx(I,{type:"link",onClick:()=>Te(s),children:"退款"}),e.jsx(I,{type:"link",onClick:()=>We(s.id),children:"同步状态"})]})]})}}],V=t=>{R(t),g({...m,current:1})},$e=t=>{if(!t){R({}),g({...m,current:1});return}const s={};t.startsWith("PAY")||t.startsWith("pay")?s.paymentNo=t:/^1[3-9]\d{9}$/.test(t)?s.phone=t:t.startsWith("ORD")?s.orderId=t:t.startsWith("wx")||t.startsWith("ali")||t.startsWith("4")||/^[a-zA-Z0-9_-]{10,}$/.test(t)?s.thirdPartyId=t:s.orderId=t,R(s),g({...m,current:1})},[ze,de]=p.useState(!1),ke=t=>{if(N(t.id)){c.info("这是未支付订单，暂无支付记录详情");return}F(t),de(!0)},ce=async t=>{var s,u;try{if(N(t)){const j=t.startsWith("UNPAID_")?"UNPAID_":"PENDING_",i=t.replace(j,""),r=d.find(S=>S.id===t);if(!r||!r.order){c.error("未找到对应的订单信息");return}await Pe.collectBalance({orderId:r.order.id||i,amount:r.amount,paymentType:"CASH",notes:`${i} - 现金支付确认`}),c.success("收款成功,订单状态已同步")}else await k.confirmPayment(t),c.success("支付确认成功,订单状态已同步");D(),ne()}catch(j){console.error("确认支付失败:",j),c.error(((u=(s=j.response)==null?void 0:s.data)==null?void 0:u.message)||"支付确认失败")}},Te=t=>{F(t),W(!0)},We=async t=>{try{if(N(t)){c.info("未支付订单无需同步状态，请先确认支付");return}await k.syncPaymentStatus(t),c.success("状态同步成功"),D()}catch{c.error("状态同步失败")}},xe=async()=>{try{await k.exportPayments(E)?c.success("导出成功"):c.warning("没有数据可导出")}catch{c.error("导出失败")}},[oe,ue]=p.useState([]),[ee,he]=p.useState({}),[re,me]=p.useState({}),Oe=async t=>{var u;const s=t.id;if(N(s)){he({...ee,[s]:{payment:t,order:t.order,paymentHistory:[],isUnpaid:!0}});return}if(!ee[s])try{me({...re,[s]:!0});const j=t.orderId||((u=t.order)==null?void 0:u.id);let i=[];if(j)try{i=await k.getPaymentHistory(j)}catch(r){console.error("加载支付历史失败:",r)}he({...ee,[s]:{payment:t,order:t.order,paymentHistory:i,isUnpaid:!1}})}catch(j){console.error("加载展开行数据失败:",j),c.error("加载详细信息失败")}finally{me({...re,[s]:!1})}},Ge=(t,s)=>{t?(ue([...oe,s.id]),Oe(s)):ue(oe.filter(u=>u!==s.id))},_e=t=>{var q,M,pe,fe,je,be,ge;const s=t.id,u=ee[s];if(re[s])return e.jsx("div",{style:{textAlign:"center",padding:"20px"},children:e.jsx(Fe,{tip:"加载中...",children:e.jsx("div",{style:{minHeight:"50px"}})})});if(!u)return e.jsx("div",{style:{textAlign:"center",padding:"20px"},children:e.jsx(ie,{description:"暂无数据"})});const{payment:i,order:r,paymentHistory:S,isUnpaid:B}=u;return e.jsx("div",{style:{padding:"0 24px 16px"},children:e.jsx(Ke,{defaultActiveKey:"payment",items:[{key:"payment",label:e.jsxs("span",{children:[e.jsx(we,{})," 支付详情"]}),children:e.jsxs(o,{bordered:!0,size:"small",column:2,children:[e.jsx(o.Item,{label:"支付单号",children:i.paymentNo||"-"}),e.jsx(o.Item,{label:"订单号",children:i.orderNo||((q=i.order)==null?void 0:q.orderNo)||"-"}),e.jsx(o.Item,{label:"支付金额",children:e.jsxs("span",{style:{color:"#1890ff",fontWeight:"bold",fontSize:"14px"},children:["¥",Number(i.amount||0).toFixed(2)]})}),e.jsx(o.Item,{label:"支付方式",children:i.method?e.jsx(w,{color:(M=_[i.method])==null?void 0:M.color,children:(pe=_[i.method])==null?void 0:pe.text}):e.jsx(w,{color:"default",children:"未支付"})}),e.jsx(o.Item,{label:"支付状态",children:e.jsx(w,{color:(fe=O[i.status])==null?void 0:fe.color,icon:(je=O[i.status])==null?void 0:je.icon,children:(be=O[i.status])==null?void 0:be.text})}),e.jsx(o.Item,{label:"第三方交易号",children:i.thirdPartyId?e.jsx("span",{style:{fontFamily:"monospace",fontSize:"12px"},children:i.thirdPartyId}):"-"}),e.jsx(o.Item,{label:"退款金额",children:Number(i.refundAmount||0)>0?e.jsxs("span",{style:{color:"#ff4d4f"},children:["¥",Number(i.refundAmount||0).toFixed(2)]}):"¥0.00"}),e.jsx(o.Item,{label:"创建时间",children:i.createdAt?new Date(i.createdAt).toLocaleString("zh-CN"):"-"}),e.jsx(o.Item,{label:"支付时间",span:2,children:i.paidAt?new Date(i.paidAt).toLocaleString("zh-CN"):"-"}),i.description&&e.jsx(o.Item,{label:"支付描述",span:2,children:i.description}),B&&e.jsx(o.Item,{label:"提示",span:2,children:e.jsx(w,{color:"orange",children:"这是未支付订单,暂无实际支付记录"})})]})},{key:"order",label:e.jsxs("span",{children:[e.jsx(Ve,{})," 订单简要"]}),children:r?e.jsxs(o,{bordered:!0,size:"small",column:2,children:[e.jsx(o.Item,{label:"订单号",children:r.orderNo||"-"}),e.jsx(o.Item,{label:"客户姓名",children:r.customerName||"-"}),e.jsx(o.Item,{label:"联系电话",children:r.phone||"-"}),e.jsx(o.Item,{label:"订单状态",children:e.jsx(w,{color:r.status==="COMPLETED"?"green":r.status==="CANCELLED"?"red":"blue",children:r.status||"-"})}),e.jsx(o.Item,{label:"套餐名称",span:2,children:r.packageName||((ge=r.package)==null?void 0:ge.name)||"-"}),e.jsx(o.Item,{label:"订单总额",children:e.jsxs("span",{style:{fontWeight:"bold"},children:["¥",Number(r.totalAmount||0).toFixed(2)]})}),e.jsx(o.Item,{label:"已付金额",children:e.jsxs("span",{style:{color:"#52c41a",fontWeight:"bold"},children:["¥",Number(r.paidAmount||0).toFixed(2)]})}),e.jsx(o.Item,{label:"未付金额",children:Number(r.totalAmount||0)-Number(r.paidAmount||0)>0?e.jsxs("span",{style:{color:"#ff4d4f",fontWeight:"bold"},children:["¥",(Number(r.totalAmount||0)-Number(r.paidAmount||0)).toFixed(2)]}):e.jsx("span",{style:{color:"#52c41a"},children:"已付清"})}),e.jsx(o.Item,{label:"已退款金额",children:Number(r.refundAmount||0)>0?e.jsxs("span",{style:{color:"#999"},children:["¥",Number(r.refundAmount||0).toFixed(2)]}):"¥0.00"}),r.appointmentDate&&e.jsx(o.Item,{label:"预约拍摄时间",span:2,children:new Date(r.appointmentDate).toLocaleString("zh-CN")}),e.jsx(o.Item,{label:"创建时间",span:2,children:r.createdAt?new Date(r.createdAt).toLocaleString("zh-CN"):"-"})]}):e.jsx(ie,{description:"订单信息不可用"})},{key:"history",label:e.jsxs("span",{children:[e.jsx(qe,{})," 历史支付 (",(S==null?void 0:S.length)||0,")"]}),children:S&&S.length>0?e.jsx(Ee,{mode:"left",items:S.map(h=>{var ve,Ae,Ie,ye;return{color:h.status===l.PAID?"green":h.status==="FAILED"?"red":h.status===l.CANCELLED?"gray":"blue",label:h.createdAt?new Date(h.createdAt).toLocaleString("zh-CN"):"-",children:e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:"8px"},children:[e.jsx(w,{color:(ve=O[h.status])==null?void 0:ve.color,children:(Ae=O[h.status])==null?void 0:Ae.text}),h.method?e.jsx(w,{color:(Ie=_[h.method])==null?void 0:Ie.color,children:(ye=_[h.method])==null?void 0:ye.text}):e.jsx(w,{color:"default",children:"未支付"}),h.id===i.id&&e.jsx(w,{color:"purple",children:"当前记录"})]}),e.jsxs("div",{style:{fontSize:"12px",color:"#666"},children:[e.jsxs("div",{children:["支付单号: ",h.paymentNo||"-"]}),e.jsxs("div",{children:["支付金额: ",e.jsxs("span",{style:{color:"#1890ff",fontWeight:"bold"},children:["¥",Number(h.amount||0).toFixed(2)]})]}),Number(h.refundAmount||0)>0&&e.jsxs("div",{children:["退款金额: ",e.jsxs("span",{style:{color:"#ff4d4f"},children:["¥",Number(h.refundAmount||0).toFixed(2)]})]}),h.thirdPartyId&&e.jsxs("div",{children:["交易号: ",h.thirdPartyId]}),h.description&&e.jsxs("div",{children:["描述: ",h.description]})]})]},h.id)}})}):e.jsx(ie,{description:B?"未支付订单暂无支付历史":"暂无支付历史记录"})}]})})};return e.jsxs("div",{children:[e.jsxs(Q,{gutter:16,style:{marginBottom:16},children:[e.jsx(P,{span:4,children:e.jsx(C,{children:e.jsx(H,{title:"总支付笔数",value:x.totalPayments,prefix:e.jsx(Ne,{})})})}),e.jsx(P,{span:4,children:e.jsx(C,{children:e.jsx(H,{title:"成功支付",value:x.successPayments,valueStyle:{color:"#52c41a"},prefix:e.jsx(ae,{})})})}),e.jsx(P,{span:4,children:e.jsx(C,{children:e.jsx(H,{title:"待支付",value:x.pendingPayments||0,valueStyle:{color:"#faad14"},prefix:e.jsx(Y,{})})})}),e.jsx(P,{span:4,children:e.jsx(C,{children:e.jsx(H,{title:"交易总额",value:x.totalAmount,precision:2,prefix:"¥",valueStyle:{color:"#1890ff"}})})}),e.jsx(P,{span:4,children:e.jsx(C,{children:e.jsx(H,{title:"今日收入",value:x.todayAmount,precision:2,prefix:"¥",valueStyle:{color:"#faad14"}})})}),e.jsx(P,{span:4,children:e.jsx(C,{children:e.jsx(H,{title:"成功率",value:(x.totalPayments>0?x.successPayments/x.totalPayments*100:0).toFixed(1),suffix:"%",valueStyle:{color:x.totalPayments>0&&x.successPayments/x.totalPayments>.8?"#52c41a":"#faad14"}})})})]}),e.jsxs(C,{children:[e.jsxs(Q,{gutter:16,style:{marginBottom:16},children:[e.jsx(P,{span:6,children:e.jsx(et,{placeholder:"搜索支付单号/订单号/手机号/第三方交易号",onSearch:$e,allowClear:!0})}),e.jsx(P,{span:4,children:e.jsx(J,{placeholder:"支付状态",allowClear:!0,style:{width:"100%"},onChange:t=>V({status:t}),children:Object.entries(O).filter(([t])=>t!==l.PENDING).map(([t,s])=>e.jsx(De,{value:t,children:s.text},t))})}),e.jsx(P,{span:4,children:e.jsx(J,{placeholder:"支付方式",allowClear:!0,style:{width:"100%"},onChange:t=>V({method:t}),children:Object.entries(_).map(([t,s])=>e.jsx(De,{value:t,children:s.text},t))})}),e.jsx(P,{span:6,children:e.jsx(tt,{placeholder:["开始日期","结束日期"],style:{width:"100%"},onChange:t=>{var s,u;V({startDate:(s=t==null?void 0:t[0])==null?void 0:s.toISOString(),endDate:(u=t==null?void 0:t[1])==null?void 0:u.toISOString()})}})})]}),e.jsxs(Q,{gutter:16,style:{marginBottom:16},children:[e.jsx(P,{span:6,children:e.jsxs(U.Compact,{style:{width:"100%"},children:[e.jsx(se,{placeholder:"最小金额",min:0,precision:2,style:{width:"50%"},onChange:t=>V({minAmount:t})}),e.jsx(se,{placeholder:"最大金额",min:0,precision:2,style:{width:"50%"},onChange:t=>V({maxAmount:t})})]})}),e.jsx(P,{span:4,children:e.jsx(I,{icon:e.jsx(G,{}),onClick:()=>{R({}),g({...m,current:1})},children:"重置筛选"})})]}),e.jsx(Q,{style:{marginBottom:16},children:e.jsxs(U,{children:[e.jsx(I,{type:"primary",icon:e.jsx(Ne,{}),onClick:()=>v(!0),children:"创建支付"}),e.jsx(I,{icon:e.jsx(Se,{}),onClick:xe,children:"导出数据"}),e.jsx(I,{onClick:()=>window.open("/reconciliation","_blank"),children:"对账管理"})]})}),a.length>0&&e.jsx(Q,{style:{marginBottom:16},children:e.jsxs(U,{children:[e.jsxs("span",{style:{color:"#666"},children:["已选 ",a.length," 项"]}),e.jsx(I,{onClick:()=>f([]),children:"取消选择"}),e.jsx(I,{icon:e.jsx(Se,{}),onClick:xe,children:"批量导出"}),e.jsx(le,{title:`确定要同步 ${a.length} 条支付记录的状态？`,onConfirm:async()=>{try{for(const t of a)N(String(t))||await k.syncPaymentStatus(String(t));c.success("批量同步完成"),f([]),D()}catch{c.error("同步失败")}},children:e.jsx(I,{icon:e.jsx(G,{}),children:"批量同步"})})]})}),e.jsx(Ye,{columns:Le,dataSource:d,loading:T,rowKey:"id",rowSelection:{selectedRowKeys:a,onChange:t=>f(t)},scroll:{x:1200,y:"calc(100vh - 420px)"},sticky:{offsetHeader:0},expandable:{expandedRowRender:_e,expandedRowKeys:oe,onExpand:Ge,expandIcon:({expanded:t,onExpand:s,record:u})=>e.jsx(I,{type:"text",size:"small",icon:t?e.jsx(Z,{}):e.jsx(we,{}),onClick:j=>s(u,j),style:{color:t?"#1890ff":"#999"}})},pagination:{...m,showSizeChanger:!0,showQuickJumper:!0,showTotal:t=>`共 ${t} 条`,onChange:(t,s)=>{g({...m,current:t,pageSize:s})}}})]}),e.jsx(Ze,{visible:ze,payment:$,onClose:()=>{de(!1),F(void 0)}}),e.jsx(Xe,{visible:K,onCancel:()=>v(!1),onSuccess:()=>{v(!1),D(),ne()}}),e.jsx(Qe,{visible:z,payment:$,onCancel:()=>{W(!1),F(void 0)},onSuccess:()=>{W(!1),F(void 0),D()}})]})};export{it as default};
