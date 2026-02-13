---
layout: page
title: Services
permalink: /services/
description: 
nav: true
nav_order: 4
display_categories: [teaching, mentoring, volunteering]
horizontal: false
---

<!-- pages/services.md -->
<div class="projects">
{%- if site.enable_service_categories and page.display_categories %}
  <!-- Display categorized services -->
  {%- for category in page.display_categories %}
  <h2 class="category">{{ category }}</h2>
  {%- assign categorized_services = site.services | where: "category", category -%}
  {%- assign sorted_services = categorized_services | sort: "importance" %}
  <!-- Generate cards for each service -->
  {% if page.horizontal -%}
  <div class="container">
    <div class="row row-cols-2">
    {%- for service in sorted_services -%}
      {%- assign project = service -%}
      {% include projects_horizontal.html %}
    {%- endfor %}
    </div>
  </div>
  {%- else -%}
  <div class="grid">
    {%- for service in sorted_services -%}
      {%- assign project = service -%}
      {% include projects.html %}
    {%- endfor %}
  </div>
  {%- endif -%}
  {% endfor %}

{%- else -%}
<!-- Display services without categories -->
  {%- assign sorted_services = site.services | sort: "importance" -%}
  <!-- Generate cards for each service -->
  {% if page.horizontal -%}
  <div class="container">
    <div class="row row-cols-2">
    {%- for service in sorted_services -%}
      {%- assign project = service -%}
      {% include projects_horizontal.html %}
    {%- endfor %}
    </div>
  </div>
  {%- else -%}
  <div class="grid">
    {%- for service in sorted_services -%}
      {%- assign project = service -%}
      {% include projects.html %}
    {%- endfor %}
  </div>
  {%- endif -%}
{%- endif -%}
</div>



