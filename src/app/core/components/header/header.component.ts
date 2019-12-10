import {
  Component,
  OnInit,
  Renderer2,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, AfterViewInit {
  @ViewChild('sidebarMenu') sidebarMenu: ElementRef;
  @ViewChild('triggerMenu') triggerMenu: ElementRef;
  constructor(private renderer: Renderer2, private elRef: ElementRef) {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.renderer.listen('window', 'click', (e: Event) => {
      if (
        e.target !== this.triggerMenu.nativeElement &&
        e.target !== this.sidebarMenu.nativeElement
      ) {
        this.closeMenu();
      } else {
        this.openMenu();
      }
    });
  }

  openMenu() {
    this.renderer.addClass(document.body, 'menu-open');
  }

  closeMenu() {
    this.renderer.removeClass(document.body, 'menu-open');
  }
}
