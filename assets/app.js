(function () {
  "use strict";

  var app = document.getElementById("app");
  var brand = document.querySelector("[data-brand]");
  var footer = document.querySelector("[data-footer]");
  var data = null;
  var activeCat = null;

  function authorById(id) {
    for (var i = 0; i < data.authors.length; i++) {
      if (data.authors[i].id === id) return data.authors[i];
    }
    return null;
  }

  function postById(id) {
    for (var i = 0; i < data.posts.length; i++) {
      if (data.posts[i].id === id) return data.posts[i];
    }
    return null;
  }

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

  function badge(status) {
    if (status === "planned") return ' <span class="badge">Planned</span>';
    return "";
  }

  function authorLink(id) {
    var a = authorById(id);
    if (!a) return "";
    return (
      '<a class="byline" href="#/author/' + a.id + '">' +
      '<img src="' + a.avatar + '" alt="" width="20" height="20">' +
      "<span>" + a.name + "</span></a>"
    );
  }

  function categories() {
    var seen = {};
    var out = [];
    data.posts.forEach(function (p) {
      if (!seen[p.categoryId]) {
        seen[p.categoryId] = { id: p.categoryId, name: p.category, count: 0 };
        out.push(seen[p.categoryId]);
      }
      seen[p.categoryId].count++;
    });
    out.sort(function (a, b) {
      return b.count - a.count;
    });
    return out;
  }

  function postListItem(p) {
    return (
      "<li>" +
      '<a class="post-title" href="#/post/' + p.id + '">' + p.title + "</a>" +
      badge(p.status) +
      '<div class="meta">' +
      authorLink(p.authorId) +
      "<time datetime=\"" + p.date + '">' + fmtDate(p.date) + "</time>" +
      '<span class="cat">' + p.category + "</span>" +
      "</div>" +
      "<p>" + p.summary + "</p>" +
      "</li>"
    );
  }

  function viewList() {
    var cats = categories();
    var chips =
      '<div class="chips"><button data-filter="" class="' +
      (activeCat ? "" : "active") +
      '">All (' +
      data.posts.length +
      ")</button>" +
      cats
        .map(function (c) {
          return (
            '<button data-filter="' + c.id + '" class="' +
            (activeCat === c.id ? "active" : "") +
            '">' + c.name + " (" + c.count + ")</button>"
          );
        })
        .join("") +
      "</div>";

    var posts = data.posts.filter(function (p) {
      return !activeCat || p.categoryId === activeCat;
    });

    var groups = [];
    posts.forEach(function (p) {
      var g = groups[groups.length - 1];
      if (!g || g.week !== p.week || g.month !== p.month) {
        g = { week: p.week, month: p.month, monthName: p.monthName, items: [] };
        groups.push(g);
      }
      g.items.push(p);
    });

    var body = groups
      .map(function (g) {
        return (
          '<h2 class="week">' + g.monthName + " &middot; Week " + g.week + "</h2>" +
          '<ul class="posts">' + g.items.map(postListItem).join("") + "</ul>"
        );
      })
      .join("");

    return (
      "<h1>Posts</h1>" +
      '<p class="intro">' + data.site.tagline + "</p>" +
      chips +
      (body || "<p>No posts in this category.</p>")
    );
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function viewSources(sources) {
    if (!sources || !sources.length) return "";
    return (
      '<section class="sources"><h2>Sources</h2><ol>' +
      sources
        .map(function (s) {
          var label = s.url
            ? '<a href="' + esc(s.url) + '" rel="noopener" target="_blank">' +
              esc(s.title) + "</a>"
            : esc(s.title);
          var meta = [];
          if (s.publisher) meta.push(esc(s.publisher));
          if (s.date) meta.push(esc(s.date));
          return (
            '<li id="src-' + esc(s.id) + '">' + label +
            (meta.length ? " — " + meta.join(", ") : "") +
            "</li>"
          );
        })
        .join("") +
      "</ol></section>"
    );
  }

  function viewPost(p) {
    return (
      "<article>" +
      '<header><h1>' + p.title + "</h1>" +
      '<div class="meta">' +
      authorLink(p.authorId) +
      '<time datetime="' + p.date + '">' + fmtDate(p.date) + "</time>" +
      '<span class="cat">' + p.category + "</span>" +
      badge(p.status) +
      "</div></header>" +
      p.body +
      viewSources(p.sources) +
      '<a class="back" href="#/">&larr; Back to posts</a>' +
      "</article>"
    );
  }

  function fieldGroup(label, items) {
    if (!items || !items.length) return "";
    return (
      '<section class="profile-field"><h3>' + label + "</h3>" +
      '<div class="tags">' +
      items
        .map(function (t) {
          return '<span class="tag">' + t + "</span>";
        })
        .join("") +
      "</div></section>"
    );
  }

  function viewAuthor(a) {
    var posts = data.posts.filter(function (p) {
      return p.authorId === a.id;
    });

    var profile = "";
    if (a.tagline) profile += '<p class="tagline">' + a.tagline + "</p>";
    if (a.about) profile += '<div class="about">' + a.about + "</div>";
    profile += fieldGroup("Beats", a.beats);
    profile += fieldGroup("Traits", a.traits);
    profile += fieldGroup("Toolkit", a.toolkit);
    if (a.joined) {
      profile += '<p class="joined">On the masthead since ' + fmtDate(a.joined) + ".</p>";
    }

    return (
      '<article class="author-page">' +
      '<header class="author-head">' +
      '<img src="' + a.avatar + '" alt="" width="56" height="56">' +
      "<div><h1>" + a.name + "</h1>" +
      '<p class="role">' + a.role + "</p></div></header>" +
      profile +
      '<h2 class="week">Posts by ' + a.name + "</h2>" +
      '<ul class="posts">' + posts.map(postListItem).join("") + "</ul>" +
      '<a class="back" href="#/authors">&larr; All authors</a>' +
      "</article>"
    );
  }

  function viewAuthors() {
    var cards = data.authors
      .map(function (a) {
        return (
          '<li><a class="author-card" href="#/author/' + a.id + '">' +
          '<img src="' + a.avatar + '" alt="" width="40" height="40">' +
          "<div><strong>" + a.name + "</strong>" +
          '<span class="role">' + a.role + "</span></div></a></li>"
        );
      })
      .join("");
    return (
      "<article><header><h1>Authors</h1></header>" +
      '<p class="intro">Every byline on this site is a persona, each with its own beat and voice.</p>' +
      '<ul class="author-list">' + cards + "</ul></article>"
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
      var post = postById(parts[1]);
      html = post ? viewPost(post) : viewNotFound();
      title = post ? post.title : "Not found";
    } else if (parts[0] === "author" && parts[1]) {
      var author = authorById(parts[1]);
      html = author ? viewAuthor(author) : viewNotFound();
      title = author ? author.name : "Not found";
    } else if (parts[0] === "authors") {
      html = viewAuthors();
      title = "Authors";
    } else if (parts[0] === "about") {
      html = viewAbout();
      title = data.about.title;
    } else {
      activeCat = null;
      html = viewList();
      title = data.site.title;
    }

    app.innerHTML = html;
    document.title =
      title === data.site.title ? title : title + " \u00b7 " + data.site.title;
    window.scrollTo(0, 0);
  }

  app.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-filter]");
    if (!btn) return;
    activeCat = btn.getAttribute("data-filter") || null;
    app.innerHTML = viewList();
  });

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
