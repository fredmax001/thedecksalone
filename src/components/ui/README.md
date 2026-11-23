# UI Primitives & Design System (`app/src/components/ui/`)

Low-level accessible UI primitives (shadcn/ui + Radix UI + Embla) alongside Deck Salone's custom dark-theme design-system composites, responsive image loader, and page skeletons. See [components/](../README.md) for higher-level domain components.

## Custom Deck Salone Additions

These three files are Deck Salone-specific (not stock shadcn/ui primitives):

| File | Exports | Responsibility |
| --- | --- | --- |
| `design-system.tsx` | `PrimaryButton`, `SecondaryButton`, `SearchBar`, `CategoryCard`, `formatSetDuration`, `SetCard`, `DJCard`, `EmptyState` | Opinionated brand components styled in Deck Salone's `#000`/`#111`/`#1B1B1B` & gold (`#FFF559`) aesthetic. `SetCard` supports `'row' \| 'featured'`, `DJCard` supports `'avatar' \| 'row'` (with direct `/booking?dj=` CTA), and `SearchBar` supports read-only modal-trigger mode. |
| `optimized-image.tsx` | `OptimizedImage`, `OptimizedImageProps` | `forwardRef` `<picture>`/`<img>` wrapper integrating `getMediaUrl`, skeleton loading state (`placeholder?: 'skeleton' \| 'blur' \| 'none'`), automatic `fallbackSrc` error handling, `fetchPriority`, and optional local WebP responsive `srcset` (`640`–`1920` widths when `responsive={true}`). |
| `page-skeletons.tsx` | `PageSkeleton`, `DashboardSkeleton`, `FeedSectionSkeleton`, `ListSkeleton` | Dark-theme route and section loading placeholders composed on top of `skeleton.tsx`. |

## Standard shadcn/ui & Radix Primitives

All primitives compose classes with `cn` (`@/lib/utils`) and use `class-variance-authority` (`cva`) where variants apply.

### Layout, Surfaces & Display
- `card.tsx` — `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`
- `table.tsx` — `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`
- `separator.tsx` — `Separator` (`@radix-ui/react-separator`)
- `skeleton.tsx` — `Skeleton`
- `avatar.tsx` — `Avatar`, `AvatarImage`, `AvatarFallback` (`@radix-ui/react-avatar`)
- `badge.tsx` — `Badge`, `badgeVariants` (`@radix-ui/react-slot`, `cva`)
- `progress.tsx` — `Progress` (`@radix-ui/react-progress`)
- `alert.tsx` — `Alert`, `AlertTitle`, `AlertDescription` (`cva` customized with dark-theme `default`, `info`, `warning`, `destructive`, and `success` variants)
- `carousel.tsx` — `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`, `type CarouselApi` (`embla-carousel-react`)

### Overlays & Navigation
- `dialog.tsx` — `Dialog` family (`@radix-ui/react-dialog`)
- `alert-dialog.tsx` — `AlertDialog` family (`@radix-ui/react-alert-dialog`)
- `sheet.tsx` — `Sheet` slide-over family (`@radix-ui/react-dialog`)
- `popover.tsx` — `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor` (`@radix-ui/react-popover`)
- `dropdown-menu.tsx` — `DropdownMenu` family (`@radix-ui/react-dropdown-menu`)
- `tabs.tsx` — `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (`@radix-ui/react-tabs`)

### Form Controls & Actions
- `button.tsx` — `Button`, `buttonVariants` (`@radix-ui/react-slot`, `cva`; includes tactile `active:scale-[0.98]` press feedback and `icon-sm`/`icon-lg` sizes)
- `input.tsx` — `Input`
- `textarea.tsx` — `Textarea`
- `label.tsx` — `Label` (`@radix-ui/react-label`)
- `select.tsx` — `Select` family (`@radix-ui/react-select`)
- `switch.tsx` — `Switch` (`@radix-ui/react-switch`)
- `toggle.tsx` — `Toggle`, `toggleVariants` (`@radix-ui/react-toggle`, `cva`)
- `toggle-group.tsx` — `ToggleGroup`, `ToggleGroupItem` (`@radix-ui/react-toggle-group`)

## Conventions & Notes

- **Naming distinction**: `ui/design-system.tsx` exports uppercase `DJCard` (generic circular/row card) whereas `home/DjCard.tsx` exports `DjCard` (homepage portrait/circle card with mix playback). Import carefully to avoid confusion.
- **Image optimization**: Prefer `OptimizedImage` over raw `<img>` for remote media so broken images swap cleanly to `fallbackSrc` without infinite error loops (`e.currentTarget.onerror = null`).
