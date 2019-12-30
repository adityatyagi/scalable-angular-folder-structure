import { Component, OnInit } from "@angular/core";
import { Meta, Title } from "@angular/platform-browser";

@Component({
  selector: "app-contact-us",
  templateUrl: "./contact-us.component.html",
  styleUrls: ["./contact-us.component.scss"]
})
export class ContactUsComponent implements OnInit {
  constructor(private _meta: Meta, private _title: Title) {
    this._meta.updateTag({ name: "author", content: "Aditya Tyagi" });
    this._meta.updateTag({
      name: "description",
      content: "Reach out to Aditya via adityatyagi.com"
    });
    this._meta.updateTag({
      name: "keywords",
      content: "Contact Aditya Tyagi, Meta Service, SEO, Angular"
    });

    // adding title
    this._title.setTitle("Contact Us | Scalable Angular App");
  }

  ngOnInit() {}
}
