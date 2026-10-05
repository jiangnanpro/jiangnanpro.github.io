---
layout: page
permalink: /publications/
title: Publications
description:
years: [2026, 2025, 2023, 2022, 2021]
nav: true
nav_order: 1
---
<!-- _pages/publications.md -->
<div class="publications">

{%- for y in page.years %}
  <div class="page-reveal" style="--entrance-delay: {{ forloop.index | times: 0.08 }}s">
  <h2 class="year">{{y}}</h2>
  {% bibliography -f papers -q @*[year={{y}}]* %}
  </div>
{% endfor %}

</div>
