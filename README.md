# Backgrid.js - (Re)orderable columns PoC
Warning! This extension is not production ready yet, just a mere proof of concept. It lacks documentation, automatic testing and edge-case tests.

To discuss this extension, see [this](https://github.com/wyuenho/backgrid/issues/6) backgrid issue;

## Demo
Online demo of can be found [here](http://techwuppet.com/backgrid_poc_demo/)

## Browser support (tested)
- IE8+
- Firefox
- Chrome

## (Re)orderable columns
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
Copyright (c) 2014 Wilbert van de Ridder
Licensed under the [MIT license](LICENSE-MIT "MIT License").
