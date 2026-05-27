import { Module } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderController } from './purchase-order.controller';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { RefundService } from './refund.service';
import { RefundController } from './refund.controller';
import { InTransitService } from './in-transit.service';
import { InTransitController } from './in-transit.controller';
import { InboundService } from './inbound.service';
import { InboundController } from './inbound.controller';

@Module({
  controllers: [
    SupplierController,
    PurchaseOrderController,
    PaymentController,
    RefundController,
    InTransitController,
    InboundController,
  ],
  providers: [
    SupplierService,
    PurchaseOrderService,
    PaymentService,
    RefundService,
    InTransitService,
    InboundService,
  ],
  exports: [
    SupplierService,
    PurchaseOrderService,
    PaymentService,
    RefundService,
    InTransitService,
    InboundService,
  ],
})
export class SupplierModule {}

