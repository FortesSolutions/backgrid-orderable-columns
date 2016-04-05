# Backgrid.js - (Re)orderable columns
Warning! This extension is not production ready yet, just a mere proof of concept. It lacks documentation, automatic testing and edge-case tests.

To discuss this extension, see [this](https://github.com/wyuenho/backgrid/issues/6) backgrid issue.

## Demo
Online demo of can be found [here](http://wridder.github.io/backgrid-demo/)

## Browser support (tested)
- IE8+
- Firefox
- Chrome

## Features
- Order columns based on 'position' attribute
- Dependency: backgrid-sizeable-columns
- Supports [grouped columns](https://github.com/WRidder/backgrid-grouped-columns)

### Example

```javascript
// Setup sortable column collection
var columnCollection = Backgrid.Columns.extend({
  sortKey: "position",
  comparator: function(item) {
    return item.get(this.sortKey) || 999;
  },
  setPositions: function() {
    _.each(this.models, function(model, index) {
      model.set("position", index + 1, {silent: true});
    });

    return this;
  }
});
var columns = new columnCollection(columnsArray);
columns.setPositions().sort();

// Add sizeable columns
var sizeAbleCol = new Backgrid.Extension.sizeAbleColumns({
  collection: pageableTerritories,
  columns: columns
});
$backgridContainer.find('thead').before(sizeAbleCol.render().el);

// Make columns reorderable
var orderHandler = new Backgrid.Extension.OrderableColumns({
  grid: pageableGrid,
  sizeAbleColumns: sizeAbleCol
});
$backgridContainer.find('thead').before(orderHandler.render().el);
```

## License
Copyright © 2016 [Fortes Solutions](https://www.fortesglobal.com/en).

Licensed under the [MIT license](LICENSE-MIT "MIT License").

## Authors
This extension was created by [Wilbert van de Ridder](https://github.com/WRidder) and is currently maintained by [Fortes Solutions Team](https://github.com/orgs/FortesSolutions/people).
