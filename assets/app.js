(function () {
  "use strict";

  var app = document.getElementById("app");
  var brand = document.querySelector("[data-brand]");
  var footer = document.querySelector("[data-footer]");
  var data = null;

  function fmtDate(iso) {
    var parts = iso.split("-").map(Number);
    var dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return dt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    });
  }

  function viewList() {
    var items = data.posts
      .map(function (p) {
        return (
          '<li>' +
          '<a href="#/post/' + p.id + '">' + p.title + "</a>" +
          '<time datetime="' + p.date + '">' + fmtDate(p.date) + "</time>" +
          "<p>" + p.summary + "</p>" +
          "</li>"
        );
      })
      .join("");

    return (
      "<h1>Posts</h1>" +
      '<p class="intro">' + data.site.tagline + "</p>" +
      '<ul class="posts">' + items + "</ul>"
    );
  }

  function viewPost(p) {
    return (
      "<article>" +
      "<header><h1>" + p.title + "</h1>" +
      '<time datetime="' + p.date + '">' + fmtDate(p.date) + "</time></header>" +
      p.body +
      '<a class="back" href="#/">&larr; Back to posts</a>' +
      "</article>"
    );
  }

  function viewAbout() {
    return (
      "<article><header><h1>" + data.about.title + "</h1></header>" +
      data.about.body +
      "</article>"
    );
  }

  function viewNotFound() {
    return (
      "<article><header><h1>Not found</h1></header>" +
      "<p>That page does not exist.</p>" +
      '<a class="back" href="#/">&larr; Back to posts</a></article>'
    );
  }

  function parseHash() {
    return location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  }

  function route() {
    var parts = parseHash();
    var html;
    var title;

    if (parts[0] === "post" && parts[1]) {
      var post = data.posts.filter(function (p) {
        return p.id === parts[1];
      })[0];
      if (post) {
        html = viewPost(post);
        title = post.title;
      } else {
        html = viewNotFound();
        title = "Not found";
      }
    } else if (parts[0] === "about") {
      html = viewAbout();
      title = data.about.title;
    } else {
      html = viewList();
      title = data.site.title;
    }

    app.innerHTML = html;
    document.title =
      title === data.site.title ? title : title + " \u00b7 " + data.site.title;
    window.scrollTo(0, 0);
  }

  fetch("data/posts.json", { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (json) {
      data = json;
      if (brand) brand.textContent = data.site.title;
      if (footer) footer.textContent = data.site.footer;
      route();
      window.addEventListener("hashchange", route);
    })
    .catch(function (err) {
      app.innerHTML =
        "<article><header><h1>Could not load content</h1></header>" +
        "<p>The content file could not be loaded (" + err.message + ").</p></article>";
    });
})();
