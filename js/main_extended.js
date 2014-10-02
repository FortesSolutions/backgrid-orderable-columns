var columnsArray = [
  {
    // enable the select-all extension
    name: "rowSelect",
    cell: "select-row",
    headerCell: "select-all",
    resizeable: false,
    width: 24
  },
  {
    name: "id", // The key of the model attribute
    label: "ID", // The name to display in the header
    editable: false, // By default every cell in a column is editable, but *ID* shouldn't be
    // Defines a cell type, and ID is displayed as an integer without the ',' separating 1000s.
    cell: Backgrid.IntegerCell.extend({
      orderSeparator: ""
    }),
    resizeable: true,
    width: 100,
    minWidth: 50,
    maxWidth: 150
  },
  {
    name: "name",
    label: "Name",
    cell: "string",
    resizeable: true,
    width: 200,
    minWidth: 150
  },
  {
    name: "age",
    label: "Age",
    cell: "integer",
    resizeable: true,
    width: 30,
    renderable: true
  },
  {
    name: "gender",
    label: "Gender",
    cell: "string",
    resizeable: true,
    width: 80,
    renderable: true
},
  {
    name: "eyeColor",
    label: "Eye color",
    cell: "string",
    resizeable: true,
    width: 80,
    renderable: true
  },
  {
    name: "phone",
    label: "Phone",
    cell: "string",
    resizeable: true,
    width: 200
  },
  {
    name: "address",
    label: "Address",
    cell: "string",
    resizeable: true,
    width: 300
  },
  {
    name: "email",
    label: "E-mail",
    cell: "email",
    resizeable: true,
    width: 300
  },
  {
    name: "company",
    label: "Company",
    cell: "string",
    resizeable: true,
    width: 120,
    renderable: true
  },
  {
    name: "domestic",
    label: "Domestic ($)",
    cell: "number",
    resizeable: false,
    width: 100
  },
  {
    name: "exports",
    label: "Exports ($)",
    cell: "number",
    resizeable: false,
    width: 100
  },
  {
    name: "total",
    label: "Total ($)",
    cell: "number",
    resizeable: false,
    width: 150
  },
  {
    name: "expenditure",
    label: "Expenditure ($)",
    cell: "number",
    resizeable: true,
    width: 150
  },
  {
    name: "profits",
    label: "Profits ($)",
    cell: "number",
    resizeable: true,
    width: 100
  },
  {
    name: "registered",
    label: "Registered",
    cell: "date",
    resizeable: true,
    width: 100,
    renderable: true
  },
  {
    name: "isActive",
    label: "Active",
    cell: "boolean",
    resizeable: true,
    width: 70,
    maxWidth: 70,
    minWidth: 70,
    renderable: true
  },
  {
    name: "latitude",
    label: "Latitude",
    cell: Backgrid.NumberCell.extend({
      orderSeparator: "",
      decimals: 6
    }),
    resizeable: true,
    width: 110,
    minWidth: 100,
    maxWidth: 150
  },
  {
    name: "longitude",
    label: "Longitude",
    cell: Backgrid.NumberCell.extend({
      orderSeparator: "",
      decimals: 6
    }),
    resizeable: true,
    width: 110,
    minWidth: 100,
    maxWidth: 150,
    renderable: true
  },
  {
    name: "notes",
    label: "Notes",
    cell: "string",
    resizeable: false
  }
];

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

var Territory = Backbone.Model.extend({});
var PageableTerritories = Backbone.PageableCollection.extend({
  model: Territory,
  url: "data_extended.json",
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
    name: "Personal info",
    label: "Personal information",
    children: [
      {
        name: "name"
      },
      {
        name: "Physical info",
        children: [
          {
            name: "age"
          },
          {
            name: "gender"
          },
          {
            name: "eyeColor"
          }
        ]
      },
      {
        name: "Contact",
        children: [
          {
            name: "Analog",
            children: [
              {
                name: "phone"
              },
              {
                name: "address"
              }
            ]
          },
          {
            name: "Digital",
            children: [
              {
                name: "email"
              }
            ]
          }
        ]
      },
      {
        name: "company"
      }
    ]
  },
  {
    name: "Balance sheet",
    children: [
      {
        name: "Revenues",
        children: [
          {
            name: "domestic"
          },
          {
            name: "exports"
          },
          {
            name: "total"
          }
        ]
      },
      {
        name: "expenditure"
      },
      {
        name: "profits"
      }
    ]
  },
  {
    name: "registered"
  },
  {
    name: "isActive"
  },
  {
    name: "Location",
    children: [
      {
        name: "latitude"
      },
      {
        name: "longitude"
      }
    ]
  }
];

var groupedHeader = Backgrid.Extension.GroupedHeader.extend({
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
// mode pageable collection"s cache.
var filter = new Backgrid.Extension.ClientSideFilter({
  collection: pageableTerritories,
  fields: ["name"]
});

// Render the filter
$backgridContainer.before(filter.render().el);

// Add some space to the filter and move it to the right
$(filter.el).css({float: "right", margin: "20px"});

// Fetch some data
pageableTerritories.fetch({reset: true});

// Add sizeable columns
var sizeAbleCol = new Backgrid.Extension.SizeAbleColumns({
  collection: pageableTerritories,
  columns: columns
});
$backgridContainer.find("thead").before(sizeAbleCol.render().el);

// Add resize handlers
var sizeHandler = new Backgrid.Extension.SizeAbleColumnsHandlers({
  sizeAbleColumns: sizeAbleCol,
  grid: pageableGrid,
  saveModelWidth: true
});
$backgridContainer.find("thead").before(sizeHandler.render().el);

// Listen to resize events
columns.on("resize", function(columnModel, newWidth, oldWidth) {
  console.log("Resize event on column; name, model, new and old width: ", columnModel.get("name"), columnModel, newWidth, oldWidth);
});

// Make columns reorderable
var orderHandler = new Backgrid.Extension.OrderableColumns({
  grid: pageableGrid,
  sizeAbleColumns: sizeAbleCol
});
$backgridContainer.find("thead").before(orderHandler.render().el);

// Demo buttons
$("#toggleHandlers").click(function() {
  var $button = $(this);
  var $handler = $("div.resizeHandler");
  if ($button.attr("data-toggle") == "true") {
    $handler.css("background-color", "#F00");
    $handler.css("opacity", "0.1");
    $handler.css("-ms-filter", "progid:DXImageTransform.Microsoft.Alpha(Opacity=10)");
    $button.attr("data-toggle", false);
  }
  else {
    $handler.css("background-color", "");
    $handler.css("opacity", "1");
    $handler.css("-ms-filter", "progid:DXImageTransform.Microsoft.Alpha(Opacity=100)");
    $button.attr("data-toggle", true);
  }
});

$("#toggleHandlerHeight").click(function() {
  var $button = $(this);
  if ($button.attr("data-toggle") == "true") {
    $backgridContainer.find("div.resizeHandler").css("height", $backgridContainer.find("thead").height());
    $button.attr("data-toggle", false);
  }
  else {
    $("div.resizeHandler").css("height", "100%");
    $button.attr("data-toggle", true);
  }
});

$("#toggleOrderHandler").click(function() {
  var $button = $(this);
  var $handler2 = $("div.orderable-indicator");
  if ($button.attr("data-toggle") == "true") {
    $handler2.css("background-color", "#00F");
    $handler2.css("-ms-filter", "progid:DXImageTransform.Microsoft.Alpha(Opacity=50)");
    $handler2.css("opacity", "0.5");
    $button.attr("data-toggle", false);
  }
  else {
    $handler2.css("background-color", "");
    $handler2.css("opacity", "1");
    $handler2.css("-ms-filter", "progid:DXImageTransform.Microsoft.Alpha(Opacity=100)");
    $button.attr("data-toggle", true);
  }
});

$("#toggleColumn").click(function() {
  var $button = $(this);
  var ageModel = _.first(columns.where({ name: "age"}));

  if ($button.attr("data-toggle") == "true") {
    ageModel.set("renderable", false);
    $button.attr("data-toggle", false);
  }
  else {
    ageModel.set("renderable", true);
    $button.attr("data-toggle", true);
  }
});

$("#addRemoveColumn").click(function() {
  var idModel = _.first(columns.where({ name: "id"}));

  if (idModel) {
    columns.remove(idModel);
  }
});