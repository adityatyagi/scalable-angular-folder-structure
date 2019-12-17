import { Component, OnInit } from "@angular/core";

// importing service
import { Meta, Title } from "@angular/platform-browser";

@Component({
  selector: "app-landing",
  templateUrl: "./landing.component.html",
  styleUrls: ["./landing.component.scss"]
})
export class LandingComponent implements OnInit {
  // injecting service
  constructor(private _meta: Meta, private _title: Title) {
    this._meta.updateTag({ name: "author", content: "Aditya Tyagi" });
    this._meta.updateTag({
      name: "description",
      content: "SEO friendly Angular Application"
    });
    this._meta.updateTag({
      name: "keywords",
      content: "Angular, Meta Service, SEO"
    });

    // adding title
    this._title.setTitle("Scalable Angular App");
  }

  ngOnInit() {}
}
