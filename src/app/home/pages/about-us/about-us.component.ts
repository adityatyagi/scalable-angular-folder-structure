import { Component, OnInit } from "@angular/core";

// importing service
import { Meta, Title } from "@angular/platform-browser";

@Component({
  selector: "app-about-us",
  templateUrl: "./about-us.component.html",
  styleUrls: ["./about-us.component.scss"]
})
export class AboutUsComponent implements OnInit {
  constructor(private _meta: Meta, private _title: Title) {
    this._meta.updateTag({ name: "author", content: "Aditya Tyagi" });
    this._meta.updateTag({
      name: "description",
      content:
        "Aditya Tyagi is trying his best to describe himself in this description"
    });
    this._meta.updateTag({
      name: "keywords",
      content: "About Aditya Tyagi, Meta Service, SEO, Angular"
    });

    // adding title
    this._title.setTitle("About Us | Scalable Angular App");
  }

  ngOnInit() {}
}
