# Event Components (`app/src/components/events/`)

Ticketing UI components for rendering scannable attendee passes and configuring multi-tier event ticket inventory. See [components/](../README.md) for the parent index.

## Key Files

| File | Exports | Responsibility |
| --- | --- | --- |
| `DigitalTicket.tsx` | `DigitalTicket` (default) | Attendee ticket pass card displaying event banner, ticket tier name, monospace `ticketNumber` (`DS-XXXX-XXXX`), status (`checked_in`, `approved`, `pending`), formatted event date (`formatEventDate`), venue/buyer info, check-in timestamp (`formatDateTime`), perforated stub divider, and high error-correction (`level="H"`) `QRCodeSVG`. |
| `TicketTypeBuilder.tsx` | `TicketTypeInput`, `TicketTypeBuilder` (default) | Controlled accordion builder for event organizers to add preset tiers (`Early Bird`, `Regular`, `VIP`, `VVIP`) or custom tiers, and configure price (default `SLE`), description, quantity (blank = unlimited), `maxPerOrder` (default 10), `saleStartsAt` / `saleEndsAt` (`datetime-local`), and `isActive` toggle. |

## Conventions & Notes

- **Pending approval guard**: When `ticket.status === 'pending'`, `DigitalTicket` hides the QR code and renders a "Pending DJ Approval" notice until the organizer/DJ approves the order.
- **QR payload fallback**: `DigitalTicket` encodes `ticket.qrPayload` when provided, falling back to `DS-TICKET:${ticket.id}:${ticket.ticketNumber}`.
- **Controlled state**: `TicketTypeBuilder` holds only local accordion expansion state (`expanded`) and delegates all mutations to the parent via `onChange(types)`.
