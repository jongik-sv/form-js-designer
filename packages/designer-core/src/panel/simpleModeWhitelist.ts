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
  tabs:             new Set<string>([]),
  tree:             new Set(['dataSource','expandedByDefault','showGuides']),
} satisfies Record<string, ReadonlySet<string>>;

type SimpleModeWhitelist = Readonly<{ [K in keyof typeof WHITELIST]: ReadonlySet<string> }> & {
  readonly [key: string]: ReadonlySet<string>;
};

export const SIMPLE_MODE_WHITELIST: SimpleModeWhitelist = WHITELIST as SimpleModeWhitelist;

export const SIMPLE_MODE_HIDDEN_GROUPS: ReadonlySet<string> =
  new Set(['condition','customProperties']);

export const SIMPLE_MODE_PASSTHROUGH_GROUPS: ReadonlySet<string> =
  new Set(['columns']);

export const SIMPLE_MODE_DEFAULT_ALLOWED: ReadonlySet<string> = new Set(['label']);

export function getAllowedEntryIds(fieldType: string | undefined): ReadonlySet<string> {
  if (!fieldType) return SIMPLE_MODE_DEFAULT_ALLOWED;
  const map = SIMPLE_MODE_WHITELIST as Readonly<Record<string, ReadonlySet<string> | undefined>>;
  return map[fieldType] ?? SIMPLE_MODE_DEFAULT_ALLOWED;
}
