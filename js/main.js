var columnsArray = [
  {
    // enable the select-all extension
    name: "rowSelect",
    cell: "select-row",
    headerCell: "select-all",
    resizeAble: false,
    width: 24
  },
  {
    name: "id", // The key of the model attribute
    label: "ID", // The name to display in the header
    editable: false, // By default every cell in a column is editable, but *ID* shouldn't be
    // Defines a cell type, and ID is displayed as an integer without the ',' separating 1000s.
    cell: Backgrid.IntegerCell.extend({
      orderSeparator: ''
    }),
    resizeAble: true,
    width: 100,
    minWidth: 50,
    maxWidth: 150
  },
  {
    name: "name",
    label: "Name",
    // The cell type can be a reference of a Backgrid.Cell subclass, any Backgrid.Cell subclass instances like *id* above, or a string
    cell: "string", // This is converted to "StringCell" and a corresponding class in the Backgrid package namespace is looked up
    resizeAble: true,
    width: 200,
    minWidth: 150
  },
  {
    name: "pop",
    label: "Population",
    cell: "integer",
    resizeAble: true,
    width: 200
  },
  {
    name: "percentage",
    label: "% of World Population",
    cell: "number",
    resizeAble: true,
    width: 200
  },
  {
    name: "date",
    label: "Date",
    cell: "date",
    resizeAble: true,
    width: 200
  },
  {
    name: "url",
    label: "URL",
    cell: "uri" // Renders the value in an HTML anchor element,
  }
];
var columns = new Backgrid.Columns(columnsArray);

var Territory = Backbone.Model.extend({});
var PageableTerritories = Backbone.PageableCollection.extend({
  model: Territory,
  url: "data.json",
  state: {
    pageSize: 15
  },
  mode: "client" // page entirely on the client side
});

var pageableTerritories = new PageableTerritories();

// Set up a grid to use the pageable collection
// Grouped column definition
var colLayout = [
  {
    name: "rowSelect"
  },
  {
    name: "id"
  },
  {
    name: "Majestic column",
    children: [{
      name: "A grouped column",
      children: [
        {
          name: "name"
        },
        {
          name: "pop"
        },
        {
          name: "percentage"
        }
      ]
    }]
  }
];

var groupedHeader = Backgrid.Extension.groupedHeader.extend({
  columnLayout: colLayout
});
var pageableGrid = new Backgrid.Grid({
  header: groupedHeader,
  columns: columns,
  collection: pageableTerritories
});

// Render the grid
var $backgridContainer = $("#backgrid-container").append(pageableGrid.render().el);

// Initialize the paginator
var paginator = new Backgrid.Extension.Paginator({
  collection: pageableTerritories
});

// Render the paginator
$backgridContainer.after(paginator.render().el);

// Initialize a client-side filter to filter on the client
// mode pageable collection's cache.
var filter = new Backgrid.Extension.ClientSideFilter({
  collection: pageableTerritories,
  fields: ['name']
});

// Render the filter
$backgridContainer.before(filter.render().el);

// Add some space to the filter and move it to the right
$(filter.el).css({float: "right", margin: "20px"});

// Fetch some data
pageableTerritories.fetch({reset: true});

// Add resizeable columns once grid is ready
pageableTerritories.once("sync", function() {
  // Add sizeable columns
  var sizeAbleCol = new Backgrid.Extension.sizeAbleColumns({
    columns: columns
  });
  $backgridContainer.find('thead').before(sizeAbleCol.render().el);

// Add resize handlers
  var sizeHandler = new Backgrid.Extension.sizeAbleColumnsHandlers({
    sizeAbleColumns: sizeAbleCol,
    grid: pageableGrid
  });
  $backgridContainer.find('thead').before(sizeHandler.render().el);
});

// Listen to resize events
columns.on('resize', function(columnModel, newWidth, oldWidth) {
  console.log('Resize event on column; name, model, new and old width: ', columnModel.get("name"), columnModel, newWidth, oldWidth);
});