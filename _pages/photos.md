---
layout: page
title: Picture Diaries
permalink: /photos/
description: Places, moments, and stories told through photographs.
nav: true
nav_order: 4
wide: true
---

{% assign sorted_diaries = site.photo_diaries | sort: "date" | reverse %}

<div class="photo-diary-list">
  {% for diary in sorted_diaries %}
    {% include photo-diary-card.html diary=diary %}
  {% endfor %}
</div>
