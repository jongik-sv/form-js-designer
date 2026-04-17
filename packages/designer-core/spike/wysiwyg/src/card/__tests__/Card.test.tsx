import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/preact';
import CardDef from '../Card';
import type { PureRenderProps } from '../../../../../src/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface CardField {
  id: string;
  type: string;
  label?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  elevation?: 0 | 1 | 2;
  header?: boolean;
  components?: unknown[];
  // index signature to satisfy FieldSchema
  [key: string]: unknown;
}

type CardProps = PureRenderProps<CardField>;

// Render via direct function call to avoid Preact component type complexity
function renderCard(fieldOverrides: Partial<CardField> = {}) {
  const field: CardField = {
    id: 'card-1',
    type: 'card',
    label: 'Test Card',
    padding: 'md',
    elevation: 1,
    header: true,
    components: [],
    ...fieldOverrides,
  };

  const props: CardProps = {
    field,
    value: null,
    domId: `dom-${field.id}`,
  };

  // Suppress assertPureRender dev warnings
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  // Call render function directly, wrapping in a functional component
  const RenderFn = CardDef.render;
  const Wrapper = () => RenderFn(props);
  return render(<Wrapper />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Card component', () => {

  // ----- Root element -----
  it('renders a root <div> with class "designer-card"', () => {
    const { container } = renderCard();
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName.toLowerCase()).toBe('div');
    expect(root.classList.contains('designer-card')).toBe(true);
  });

  it('sets data-fjs-id equal to field.id on root element', () => {
    const { container } = renderCard({ id: 'my-card-id' });
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('data-fjs-id')).toBe('my-card-id');
  });

  // ----- Padding variants -----
  it('applies designer-card--pad-none when padding is "none"', () => {
    const { container } = renderCard({ padding: 'none' });
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains('designer-card--pad-none')).toBe(true);
  });

  it('applies designer-card--pad-sm when padding is "sm"', () => {
    const { container } = renderCard({ padding: 'sm' });
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains('designer-card--pad-sm')).toBe(true);
  });

  it('applies designer-card--pad-md when padding is "md" (default)', () => {
    const { container } = renderCard({ padding: 'md' });
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains('designer-card--pad-md')).toBe(true);
  });

  it('defaults to pad-md when padding is not specified', () => {
    const { container } = renderCard({ padding: undefined });
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains('designer-card--pad-md')).toBe(true);
  });

  it('applies designer-card--pad-lg when padding is "lg"', () => {
    const { container } = renderCard({ padding: 'lg' });
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains('designer-card--pad-lg')).toBe(true);
  });

  // ----- Elevation variants -----
  it('applies designer-card--elev-0 when elevation is 0', () => {
    const { container } = renderCard({ elevation: 0 });
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains('designer-card--elev-0')).toBe(true);
  });

  it('applies designer-card--elev-1 when elevation is 1 (default)', () => {
    const { container } = renderCard({ elevation: 1 });
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains('designer-card--elev-1')).toBe(true);
  });

  it('defaults to elev-1 when elevation is not specified', () => {
    const { container } = renderCard({ elevation: undefined });
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains('designer-card--elev-1')).toBe(true);
  });

  it('applies designer-card--elev-2 when elevation is 2', () => {
    const { container } = renderCard({ elevation: 2 });
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains('designer-card--elev-2')).toBe(true);
  });

  // ----- Header -----
  it('renders .designer-card__header with .designer-card__title when label is non-empty and header !== false', () => {
    const { container } = renderCard({ label: 'My Title', header: true });
    const header = container.querySelector('.designer-card__header');
    expect(header).not.toBeNull();
    const title = container.querySelector('.designer-card__title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe('My Title');
  });

  it('does NOT render the header when label is empty string', () => {
    const { container } = renderCard({ label: '' });
    const header = container.querySelector('.designer-card__header');
    expect(header).toBeNull();
  });

  it('does NOT render the header when header is false even if label is set', () => {
    const { container } = renderCard({ label: 'Has Label', header: false });
    const header = container.querySelector('.designer-card__header');
    expect(header).toBeNull();
  });

  it('does NOT render the header when label is undefined', () => {
    const { container } = renderCard({ label: undefined });
    const header = container.querySelector('.designer-card__header');
    expect(header).toBeNull();
  });

  // ----- Body -----
  it('always renders .designer-card__body with .designer-card__text child', () => {
    const { container } = renderCard();
    const body = container.querySelector('.designer-card__body');
    expect(body).not.toBeNull();
    const text = body!.querySelector('.designer-card__text');
    expect(text).not.toBeNull();
  });

  it('renders body even when label is empty (no header)', () => {
    const { container } = renderCard({ label: '' });
    const body = container.querySelector('.designer-card__body');
    expect(body).not.toBeNull();
  });

  // ----- Static .config via component -----
  it('exported .config has type "card"', () => {
    expect(CardDef.component.config.type).toBe('card');
  });

  it('exported .config has keyed: false', () => {
    expect(CardDef.component.config.keyed).toBe(false);
  });

  it('exported .config has pathed: false', () => {
    expect(CardDef.component.config.pathed).toBe(false);
  });

  it('exported .config has escapeGridRender: true', () => {
    expect(CardDef.component.config.escapeGridRender).toBe(true);
  });

  it('exported .config has name "Card"', () => {
    expect(CardDef.component.config.name).toBe('Card');
  });

  it('exported .config has group "container"', () => {
    expect(CardDef.component.config.group).toBe('container');
  });

  // ----- .config.create() -----
  it('.config.create() returns an object with type "card"', () => {
    const created = CardDef.component.config.create();
    expect(created).toMatchObject({ type: 'card' });
  });

  it('.config.create() returns sensible defaults', () => {
    const created = CardDef.component.config.create();
    expect(created).toMatchObject({
      type: 'card',
      label: 'Card',
      padding: 'md',
      elevation: 1,
      header: true,
      components: [],
    });
  });

  it('.config.create() applies overrides from options arg', () => {
    const created = CardDef.component.config.create({ label: 'Custom', padding: 'lg' });
    expect(created).toMatchObject({
      type: 'card',
      label: 'Custom',
      padding: 'lg',
    });
  });

  // ----- Purity: identical props => identical HTML -----
  it('renders equivalent HTML on two calls with identical props (purity check)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const field: CardField = {
      id: 'card-1',
      type: 'card',
      label: 'Test',
      padding: 'md',
      elevation: 1,
      header: true,
      components: [],
    };

    const props: CardProps = { field, value: null, domId: 'dom-card-1' };

    const RenderFn = CardDef.render;
    const Wrapper1 = () => RenderFn(props);
    const Wrapper2 = () => RenderFn(props);

    const { container: c1 } = render(<Wrapper1 />);
    const { container: c2 } = render(<Wrapper2 />);

    expect(c1.innerHTML).toBe(c2.innerHTML);
  });
});
