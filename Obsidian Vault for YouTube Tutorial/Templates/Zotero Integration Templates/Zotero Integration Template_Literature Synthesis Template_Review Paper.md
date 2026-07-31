---
tags:
  - LitRev
  - Experiment
  - JournalPaper
  - ConferencePaper
aliases: 
How to use: (a) Delete/add tags or the excalibrain matters accordingly, (b)Delete the Methodology for the Review section if not a review paper.
---

# Title: {{title}}
#### Tags: 
{{hashTags}}
#### Basic Info
Year: {{date | format("YYYY")}}
Authors: {{authors}}
Zotero link: {{pdfZoteroLink}}
## Abstract
> [!NOTE]- Abstract
> {{abstractNote}}
## Zotero Markups and Figures
{%-
    set zoteroColors = {
        "#2ea8e5": "blue",
        "#5fb236": "green",
        "#ff6666": "red",
        "#ffd400": "yellow",
        "#f19837": "orange",
        "#aaaaaa": "grey",
        "#a28ae5": "purple",
        "#e56eee": "magenta"
    }
-%}

{%-
   set colorHeading = {
		"blue": "Blue means Opportunity.",
		"green": "Green means good",
		"red": "Red means bad",
		"yellow": "Yellow means needs further discussion",
		"orange": "Orange means gap??? Maybe.",
		"grey": "Grey",
		"purple": "Purple means agree with the author",
		"magenta": "Magenta means disagree with the author"
   }
-%}

{%- macro calloutHeader(type) -%}
    {%- switch type -%}
        {%- case "highlight" -%}
        Highlight
        {%- case "image" -%}
        Image
        {%- default -%}
        Note
    {%- endswitch -%}
{%- endmacro %}

{%- set newAnnot = [] -%}
{%- set newAnnotations = [] -%}
{%- set annotations = annotations | filterby("date", "dateafter", lastImportDate) %}

{%- for annot in annotations -%}
    {%- if annot.color in zoteroColors -%}
        {%- set customColor = zoteroColors[annot.color] -%}
    {%- elif annot.colorCategory|lower in colorHeading -%}
    	{%- set customColor = annot.colorCategory|lower -%}
    {%- else -%}
	    {%- set customColor = "other" -%}
    {%- endif -%}
    {%- set newAnnotations = (newAnnotations.push({"annotation": annot, "customColor": customColor}), newAnnotations) -%}
{%- endfor -%}

{%- for color, heading in colorHeading -%}
{%- for entry in newAnnotations | filterby ("customColor", "startswith", color) -%}
{%- set annot = entry.annotation -%}

{%- if entry and loop.first %}
#### {{colorHeading[color]}}
{%- endif %}

> [!quote]+ {{calloutHeader(annot.type)}} ([Page {{annot.page}}]({{annot.desktopURI}}))

{%- if annot.annotatedText %}
> {{annot.annotatedText}} {% if annot.hashTags %}{{annot.hashTags}}{% endif -%}
{%- endif %}

{%- if annot.imageRelativePath %}
> ![[{{annot.imageRelativePath}}]]
> {{annot.annotatedText}} {% if annot.hashTags %}{{annot.hashTags}}{% endif -%}
{%- endif %}

{%- if annot.ocrText %}
> {{annot.ocrText}}
{%- endif %}

{%- if annot.comment %}
> - **{{annot.comment}}**
{%- endif -%}

{%- endfor -%}
{%- endfor -%}

## Methodology for the Review
### Protocol

### Database

### Search String
## Key Takeaway:
1. 
2.  

## Summary:

## Key Findings:

## Strength and Weakness:
### Strength
- 
### Weakness
- 

## Other Details (If needed)
### Main Arguments:

### Theoretical Frameworks and Relation to Findings:

### Comparison: 

### Analysis Appropriation:

### Suggestion to Further Research:

### Other notes

### Connected Items

## Limitations

## References and their usage:



## Summary Table





%%
North:: [[Resesarch]],  [[Landscape Architecture]]
South:: [[Publication]]
West:: [[Landscape Education]], [[XR Development]], [[Application Development]], [[Educational Theory]], [[Instructional Technology]], [[Research Method]], [[Scoping Review]], [[Systematic Review]], [[Mini Review]], [[Legends for Analysis]]
East::
%%