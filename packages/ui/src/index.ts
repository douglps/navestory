export {
  CURRENCY_MAX_DIGITS,
  ODOMETER_MAX_DIGITS,
  digitsToCurrencyDisplay,
  digitsToOdometerDisplay,
  currencyDigitsToValue,
  valueToCurrencyDigits,
  odometerDigitsToValue,
  valueToOdometerDigits,
  CurrencyInput,
  OdometerInput,
} from "./components/masked-input";
export {
  PLATE_MAX_CHARS,
  PlateInput,
  type PlateInputProps,
  formatPlateDisplay,
} from "./components/plate-input";

export { Button, type ButtonProps } from "./components/button";
export { Input, type InputProps, inputBaseClass } from "./components/input";
export { Textarea, type TextareaProps } from "./components/textarea";
export { Checkbox, type CheckboxProps } from "./components/checkbox";
export { Switch, type SwitchProps } from "./components/switch";
export { Badge, type BadgeProps } from "./components/badge";
export { Skeleton } from "./components/skeleton";
export { Container, type ContainerProps } from "./components/container";
export { Tooltip, type TooltipProps } from "./components/tooltip";
export { Card, type CardProps } from "./components/card";
export { Alert, type AlertProps } from "./components/alert";
export { EmptyState, type EmptyStateProps } from "./components/empty-state";
export { KpiCard, type KpiCardProps, type KpiCardVariant } from "./components/kpi-card";
export {
  ToastViewport,
  type ToastViewportProps,
  type ToastItem,
  type ToastVariant,
} from "./components/toast";
export { Combobox, type ComboboxProps, type ComboboxOption } from "./components/combobox";
export { Tabs, type TabsProps, type TabItem } from "./components/tabs";
export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  type TableRowProps,
  TableHead,
  TableCell,
} from "./components/table";
export { Steps, type StepsProps, type StepItem } from "./components/steps";
export {
  DateRangePicker,
  type DateRangePickerProps,
  type DateRange,
  type DateRangePreset,
} from "./components/date-range-picker";
export { FileUpload, type FileUploadProps } from "./components/file-upload";
export { ChartWrapper, type ChartWrapperProps } from "./components/chart-wrapper";
export {
  ChartTooltip,
  type ChartTooltipProps,
  type ChartTooltipPayloadItem,
} from "./components/chart-tooltip";
export { Breadcrumb, type BreadcrumbProps, type BreadcrumbItem } from "./components/breadcrumb";
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  type DialogContentProps,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/dialog";
export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogClose,
  AlertDialogContent,
  type AlertDialogContentProps,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./components/alert-dialog";

export { NavBadge, type NavBadgeProps } from "./components/nav-badge";
export {
  VehicleHealthScore,
  type VehicleHealthScoreProps,
} from "./components/vehicle-health-score";
export { ThemeToggle, type ThemeToggleProps } from "./components/theme-toggle";
export { AvatarDropdown, type AvatarDropdownProps } from "./components/avatar-dropdown";
export {
  CommandPalette,
  type CommandPaletteProps,
  type CommandPaletteItem,
} from "./components/command-palette";

// ── Onda 2: DatePicker, PlateDisplay, CurrencyShortcuts, Label, Popover ──────

export { DatePicker, type DatePickerProps } from "./components/date-picker";

export {
  PlateDisplay,
  type PlateDisplayProps,
  type PlateDisplaySize,
} from "./components/plate-display";

export {
  CurrencyShortcuts,
  type CurrencyShortcutsProps,
  type ShortcutItem,
} from "./components/currency-shortcuts";

export { Label, type LabelProps } from "./components/label";

export {
  Popover,
  PopoverTrigger,
  PopoverAnchor,
  PopoverContent,
  type PopoverContentProps,
} from "./components/popover";

// ── Onda 3: Icon, Typography, SelectNative, StatsCard ────────────────────────

export { Icon, type IconProps, type IconSize, type IconColor } from "./components/icon";

export {
  Typography,
  typographyVariants,
  type TypographyProps,
} from "./components/typography";

export { SelectNative, type SelectNativeProps } from "./components/select";

export {
  StatsCard,
  type StatsCardProps,
  type StatsCardVariant,
} from "./components/stats-card";

// ── Utilitários ───────────────────────────────────────────────────────────────

export { cn } from "./lib/cn";
