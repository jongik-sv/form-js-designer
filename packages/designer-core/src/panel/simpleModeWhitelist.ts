const WHITELIST = {
  textfield:        new Set(['label','defaultValue','required']),
  textarea:         new Set(['label','defaultValue','required']),
  number:           new Set(['label','defaultValue','required']),
  checkbox:         new Set(['label','defaultValue','required']),
  checklist:        new Set(['label','staticOptions','defaultValue','required']),
  radio:            new Set(['label','staticOptions','defaultValue','required']),
  select:           new Set(['label','staticOptions','defaultValue','required']),
  taglist:          new Set(['label','staticOptions','defaultValue','required']),
  datetime:         new Set(['subtype','date-label','time-label','required']),
  filepicker:       new Set(['label','accept','multiple','required']),
  button:           new Set(['label','action']),
  group:            new Set(['label']),
  dynamiclist:      new Set(['label','defaultRepetitions']),
  iframe:           new Set(['label','url','iframe-height']),
  table:            new Set(['label','dataSource','staticColumns']),
  documentPreview:  new Set(['label','dataSource']),
  text:             new Set(['text']),
  html:             new Set(['content']),
  image:            new Set(['imageSource','altText']),
  spacer:           new Set(['spacer-height']),
  separator:        new Set<string>([]),
  expression:       new Set(['expression-expression']),
  default:          new Set(['id']),
  card:             new Set(['header','headerTag','padding','elevation']),
  chartPlaceholder: new Set(['chartType','title','description']),
  modal:            new Set(['title','triggerLabel','size']),
  tabPanel:         new Set(['label']),
  tabs:             new Set(['defaultValue']),
  tree:             new Set(['dataSource','expandedByDefault','showGuides']),
} satisfies Record<string, ReadonlySet<string>>;

type SimpleModeWhitelist = Readonly<{ [K in keyof typeof WHITELIST]: ReadonlySet<string> }> & {
  readonly [key: string]: ReadonlySet<string>;
};

export const SIMPLE_MODE_WHITELIST: SimpleModeWhitelist = WHITELIST as SimpleModeWhitelist;

// form-js native group ids vary by version: some use plain ids ('condition',
// 'custom-values', 'layout'), others use the `group-` prefix
// ('group-condition', 'group-custom-values', 'group-layout'). Both forms are
// listed here so the filter works across versions without per-release patches.
// Per properties-panel-cleanup.md §7: Condition / Appearance(adorner) /
// Serialization / Constraints / Security / Custom properties are hidden in
// Simple mode regardless of their entry contents.
export const SIMPLE_MODE_HIDDEN_GROUPS: ReadonlySet<string> = new Set([
  'condition', 'customProperties', 'custom-values',
  'appearance', 'serialization', 'constraints', 'security',
  'group-condition', 'group-customProperties', 'group-custom-values',
  'group-appearance', 'group-serialization', 'group-constraints', 'group-security',
]);

// Passthrough groups have all their entries surfaced in Simple mode without
// running through the entry-id whitelist. This is required for groups whose
// entry ids carry per-row suffixes that the whitelist can't enumerate ahead
// of time — e.g. form-js's `group-staticOptions` exposes entries like
// `staticOptions-0-label`, `staticOptions-0-value`, etc., one set per row.
// The companion `group-valuesSource` toggles between static/dynamic data
// sources and must accompany staticOptions so users can switch modes.
// Layout (columns) is included because grid placement is essential.
export const SIMPLE_MODE_PASSTHROUGH_GROUPS: ReadonlySet<string> = new Set([
  'columns', 'layout',
  'group-columns', 'group-layout',
  'staticOptions', 'group-staticOptions',
  'valuesSource', 'group-valuesSource',
]);

export const SIMPLE_MODE_DEFAULT_ALLOWED: ReadonlySet<string> = new Set(['label']);

export function getAllowedEntryIds(fieldType: string | undefined): ReadonlySet<string> {
  if (!fieldType) return SIMPLE_MODE_DEFAULT_ALLOWED;
  const map = SIMPLE_MODE_WHITELIST as Readonly<Record<string, ReadonlySet<string> | undefined>>;
  return map[fieldType] ?? SIMPLE_MODE_DEFAULT_ALLOWED;
}
