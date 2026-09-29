import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('renders the navigator with the default items', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const labels = [...compiled.querySelectorAll('dnd-navigator .tile-label')].map((el) =>
      el.textContent?.trim(),
    );
    expect(labels).toContain('Home');
    expect(labels).toContain('Media');
  });
});
