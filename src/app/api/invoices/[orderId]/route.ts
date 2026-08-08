/**
 * GET /api/invoices/[orderId]
 *
 * Generates and returns a print-ready HTML invoice.
 * Open in browser → File → Print → Save as PDF.
 *
 * Access control:
 *   - Authenticated users: can only download their own invoices
 *   - Admins: can download any invoice
 */
import { getCurrentUser } from "@/lib/appwrite-server";
import { getOrderByIdRepo } from "@/repositories/orderRepository";
import { getShipmentByOrderIdRepo } from "@/repositories/shipmentRepository";
import { formatINR } from "@/lib/utils";


export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const resolvedParams = await params;
  const orderId = decodeURIComponent(resolvedParams.orderId || "").trim();

  if (!orderId) {
    return new Response("Order ID is required", { status: 400 });
  }

  const order = await getOrderByIdRepo(orderId);
  if (!order) {
    return new Response("Order not found", { status: 404 });
  }

  // Non-admins can only view their own invoices
  if (user.role !== "admin" && order.userId !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const shipment = await getShipmentByOrderIdRepo(orderId);
  const addr = order.shippingAddress;

  const products = order.products || [];
  const subtotal = order.subtotal || products.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = order.shippingCharge || 99;
  const discount = order.discount || 0;

  const itemRows = products
    .map(
      (item, idx) => `
      <tr class="item-row ${idx % 2 === 0 ? "even" : "odd"}">
        <td>${item.productId}</td>
        <td>${item.size}</td>
        <td class="center">${item.qty}</td>
        <td class="right">${formatINR(item.price)}</td>
        <td class="right">${formatINR(item.price * item.qty)}</td>
      </tr>`
    )
    .join("");


  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice — ${orderId}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #fff;
      color: #111;
      font-size: 13px;
      padding: 32px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #111; padding-bottom: 16px; }
    .brand { font-size: 24px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; }
    .brand-sub { font-size: 11px; color: #555; margin-top: 2px; }
    .invoice-meta { text-align: right; }
    .invoice-meta h2 { font-size: 18px; font-weight: 700; color: #111; }
    .invoice-meta p { color: #555; font-size: 12px; margin-top: 2px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #555; margin-bottom: 6px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .address p { line-height: 1.6; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #111; color: #fff; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    th.center, td.center { text-align: center; }
    th.right, td.right { text-align: right; }
    td { padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #eee; }
    tr.even td { background: #fafafa; }
    .totals-table { margin-top: 12px; }
    .totals-table td { border: none; padding: 4px 10px; }
    .totals-table tr.total td { font-weight: 700; font-size: 15px; border-top: 2px solid #111; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-paid { background: #d1fae5; color: #065f46; }
    .badge-pending { background: #fef9c3; color: #713f12; }
    .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
    @media print {
      body { padding: 16px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px; text-align:right;">
    <button onclick="window.print()" style="background:#111;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-size:13px;cursor:pointer;">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <div>
      <div class="brand">The Asher Store</div>
      <div class="brand-sub">Premium Football Jerseys</div>
    </div>
    <div class="invoice-meta">
      <h2>TAX INVOICE</h2>
      <p>Date: ${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
      <p>Invoice #: INV-${orderId.toUpperCase().slice(-10)}</p>
    </div>
  </div>

  <div class="grid-2 section">
    <div class="address">
      <div class="section-title">Bill To</div>
      ${addr
        ? `<p><strong>${addr.name}</strong></p>
           <p>${addr.addressLine1}${addr.addressLine2 ? ", " + addr.addressLine2 : ""}</p>
           <p>${addr.city}, ${addr.state} — ${addr.pincode}</p>
           <p>${addr.country || "India"}</p>
           <p>${addr.phone || order.customerPhone || ""}</p>`
        : `<p><strong>${order.customerName || order.customerEmail}</strong></p><p>Address not provided</p>`}
      <p>${order.customerEmail}</p>
    </div>
    <div>
      <div class="section-title">Order Details</div>
      <p><strong>Order ID:</strong> ${orderId}</p>
      ${order.paymentId ? `<p><strong>Payment ID:</strong> ${order.paymentId}</p>` : ""}
      ${(shipment?.awbNumber || order.awbNumber) ? `<p><strong>AWB:</strong> ${shipment?.awbNumber || order.awbNumber}</p>` : ""}
      ${(shipment?.awbNumber || order.awbNumber) ? `<p><strong>Courier:</strong> ${shipment?.courierPartner || order.courierPartner || "Delhivery"}</p>` : ""}
      <p><strong>Payment:</strong> <span class="badge badge-paid">${order.paymentStatus}</span></p>
      <p><strong>Status:</strong> ${order.shipmentStatus}</p>
    </div>
  </div>


  <div class="section">
    <div class="section-title">Items Ordered</div>
    <table>
      <thead>
        <tr>
          <th>Product ID</th>
          <th>Size</th>
          <th class="center">Qty</th>
          <th class="right">Unit Price</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
  </div>

  <div style="display:flex; justify-content:flex-end;">
    <table class="totals-table" style="width:280px;">
      <tbody>
        <tr>
          <td>Subtotal</td>
          <td class="right">${formatINR(subtotal)}</td>
        </tr>
        <tr>
          <td>Shipping</td>
          <td class="right">${formatINR(shipping)}</td>
        </tr>
        ${discount > 0 ? `<tr><td>Discount</td><td class="right">-${formatINR(discount)}</td></tr>` : ""}
        <tr class="total">
          <td>Total Paid</td>
          <td class="right">${formatINR(order.total)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Thank you for shopping with THE ASHER STORE!</p>
    <p>This is a computer-generated invoice. For support: support@asherstore.in</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
