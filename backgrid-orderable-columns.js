/*
 backgrid-orderable-columns
 https://github.com/WRidder/backgrid-orderable-columns

 Copyright (c) 2014 Wilbert van de Ridder
 Licensed under the MIT @license.
 */
(function (root, factory) {
  // CommonJS
  if (typeof exports == "object") {
    module.exports = factory(require("underscore"), require("backgrid"));
  }
  // AMD. Register as an anonymous module.
  else if (typeof define === 'function' && define.amd) {
    define(['underscore', 'backgrid'], factory);
  }
  // Browser
  else {
    factory(root._, root.Backgrid);
  }
}(this, function (_, Backgrid) {
  "use strict";

  // Adds width support to columns
  Backgrid.Extension.OrderableColumns = Backbone.View.extend({
    dragHooks: {},

    /**
     * Initializer
     * @param options
     */
    initialize: function (options) {
      this.sizeAbleColumns = options.sizeAbleColumns;
      this.grid = this.sizeAbleColumns.grid;
      this.columns = this.grid.columns;
      this.header = this.grid.header;
      this.collection = this.grid.collection;
      this.moveThreshold = options.moveThreshold || 10;

      this.attachEvents();
      this.setHeaderElements();
    },

    /**
     * Adds handlers to reorder the columns
     * @returns {Backgrid.Extension.OrderableColumns}
     */
    render: function () {
      var self = this;
      self.$el.empty();

      // Create indicators
      self.addIndicators();

      // Attach
      var $rows = self.header.$el.find('tr');
      $rows.each(function (rowIndex, rowEl) {
        // Iterate over th elements
        $(rowEl).children("th").each(function (index, headerEl) {
          // Get matching col element(s)
          var $theader = $(headerEl);
          var columnModel;
          var orderable;
          var startIndex = _.indexOf(self.headerElements, headerEl);
          var columnSpan = 1;
          if (startIndex > -1) {
            columnModel = self.headerCells[startIndex].column;
            orderable = typeof columnModel.get("orderable") == "undefined" || columnModel.get("orderable");
          }
          else {
            orderable = false;
            var headerRows = self.header.headerRows || [self.header.row];
            if (headerRows) {
              var subColumnNames = headerRows[rowIndex].columns.at(index).get("childColumns");
              startIndex = self.columns.indexOf(self.columns.get(_.first(self.columns.where({ name: subColumnNames[0]}))));
              columnSpan = subColumnNames.length;
              orderable = true;
            }
          }

          if (orderable) {
            // Make draggable
            $theader.on("mousedown", function (e) {
              // Check if left-click
              if (e.which === 1) {
                self._stopEvent(e);
                var startX = $theader.position().left;
                var startPageX = e.pageX;
                var $doc = $(document);

                // Helper function to find closest indicator
                var closest = null;
                var closestIndex = null;
                var validMove = false;
                var orderPrevented = false;
                var $closestIndicator;
                var highlightClosestIndicator = function highlightClosestIndicator(newLeftPos, evt) {
                  // Remove current indicator
                  if ($closestIndicator) {
                    $closestIndicator.removeClass('orderable-indicator-active');
                  }

                  _.each(self.indicatorPositions, function (val, key) {
                    if (closest == null || Math.abs(val.x - newLeftPos) < Math.abs(closest - newLeftPos)) {
                      closest = val.x;
                      closestIndex = parseInt(key);
                      $closestIndicator = val.$el;
                    }
                  });

                  var newIndex = closestIndex;
                  var movedRight = startIndex < newIndex;
                  validMove = startIndex != newIndex && ((movedRight && (newIndex < startIndex + 1 ||
                    newIndex > startIndex + columnSpan)) || !movedRight) && thresHoldPassed;

                  if (!self.dragHookPreventOrder($columnDraggable, evt, columnModel)) {
                    if (validMove) {
                      $closestIndicator.addClass('orderable-indicator-active');
                      orderPrevented = false;
                    }
                  }
                  else {
                    orderPrevented = true;
                  }
                };

                // Create copy of column element
                var $columnDraggable = $("<div></div>")
                  .addClass("orderable-draggable")
                  .hide()
                  .appendTo(self.$el)
                  .width($theader.outerWidth())
                  .height($theader.outerHeight())
                  .css({
                    left: startX,
                    top: $theader.position().top
                  });

                // Follow the mouse
                var thresHoldPassed = false;
                var dragStarted = false;
                var mouseMoveHandler = function (evt) {
                  self._stopEvent(evt);
                  var newLeftPos = startX + (evt.pageX - startPageX);
                  var delta = Math.abs(startX - newLeftPos);

                  // Only move beyond threshold
                  if (thresHoldPassed) {
                    // If first drag, notify drag hooks
                    if (!dragStarted) {
                      dragStarted = true;

                      // Notify drag hooks
                      self.dragHookInvoke("dragStart", evt, columnModel);
                    }

                    // Highlight nearest indicator
                    highlightClosestIndicator(evt.pageX - self.grid.$el.offset().left, evt);
                    $theader.addClass("orderable-ordering");

                    // Notify drag hooks
                    self.dragHookInvoke("dragMove", $columnDraggable, evt, columnModel);

                    // Apply mouse change to handler
                    $columnDraggable.css({
                      left: newLeftPos
                    }).show();
                  }
                  else if (delta >= self.moveThreshold) {
                    thresHoldPassed = true;
                  }

                };
                $doc.on("mousemove", mouseMoveHandler);

                // Add handler to listen for mouseup
                var mouseUpHandler = function (evt) {
                  // Cleanup
                  self._stopEvent(evt);
                  $columnDraggable.remove();
                  if ($closestIndicator) {
                    $closestIndicator.removeClass('orderable-indicator-active');
                  }
                  $theader.removeClass("orderable-ordering");
                  $doc.off("mouseup", mouseUpHandler);
                  $doc.off("mousemove", mouseMoveHandler);
                  dragStarted = false;

                  // Notify drag hooks
                  self.dragHookInvoke("dragEnd", evt, columnModel);

                  if (validMove && !orderPrevented) {
                    var oldIndex = startIndex;
                    var newIndex = closestIndex;
                    var movedRight = oldIndex < newIndex;
                    var deltaIndex = newIndex - oldIndex;

                    // Update position attributes
                    self.columns.each(function (model, ind) {
                      if (movedRight) {
                        if (ind >= oldIndex && ind < oldIndex + columnSpan) {
                          model.set("displayOrder", model.get("displayOrder") + deltaIndex - columnSpan, {silent: true});

                        }
                        else if (ind > oldIndex && ind < newIndex) {
                          model.set("displayOrder", model.get("displayOrder") - columnSpan, {silent: true});
                        }
                      }
                      else {
                        if (ind >= oldIndex && ind < oldIndex + columnSpan) {
                          model.set("displayOrder", model.get("displayOrder") + deltaIndex, {silent: true});

                        }
                        else if (ind > newIndex && ind < oldIndex) {
                          model.set("displayOrder", model.get("displayOrder") + columnSpan, {silent: true});
                        }
                        else if (newIndex == ind) {
                          model.set("displayOrder", model.get("displayOrder") + columnSpan, {silent: true});
                        }
                      }
                    });

                    // Trigger event indicating column reordering
                    self.columns.trigger("ordered");

                    // Sort columns
                    self.columns.sort();

                    // Refresh body
                    self.grid.body.refresh();
                  }
                };
                $doc.on("mouseup", mouseUpHandler);
              }
            });
          }
        });
      });

      // Position drag handlers
      self.updateHandlerPosition();

      return this;
    },

    /**
     * Adds indicators which will show at which spot the column will be placed while dragging
     * @private
     */
    addIndicators: function () {
      var self = this;
      self.indicators = [];

      var previousIndicators = false;
      _.each(self.headerCells, function (headerCell) {
        var model = headerCell.column;
        var index = self.columns.indexOf(model);
        if (previousIndicators || model.get("orderable")) {
          self.$el.append(self.createIndicator(index, headerCell));

          // This boolean is used to see to what extend we can omit indicators upfront
          previousIndicators = true;
        }
      });

      // Add trailing indicator
      if (!_.isEmpty(self.headerCells) && _.last(self.headerCells).column.get("orderable")) {
        self.$el.append(self.createIndicator(self.headerCells.length, null));
      }

      // Set indicator height
      self.setIndicatorHeight(self.grid.header.$el.height());
    },

    /**
     * Create a single indicator
     * @param {Integer} index
     * @param {Backgrid.Cell} cell
     * @returns {*|JQuery|any|jQuery}
     * @private
     */
    createIndicator: function (index, cell) {
      var self = this;

      // Create helper elements
      var $indicator = $("<div></div>")
        .addClass("orderable-indicator")
        .data("column-cell", cell)
        .data("column-index", index);
      self.indicators.push($indicator);

      return $indicator;
    },

    /**
     * Sets height of all indicators matching the table header
     * @private
     */
    setIndicatorHeight: function () {
      this.$el.children().height(this.grid.header.$el.height());
    },

    /**
     * Attach event handlers
     * @private
     */
    attachEvents: function () {
      var self = this;
      self.listenTo(self.columns, "change:resizeAble", self.render);
      self.listenTo(self.columns, "resize", self.handleColumnResize);
      self.listenTo(self.columns, "remove", self.handleColumnRemove);
      self.listenTo(self.grid.collection, "backgrid:colgroup:updated", self.updateHandlerPosition);
      self.listenTo(self.grid.collection, "backgrid:colgroup:changed", self.handleHeaderRender);
    },

    /**
     * Handlers when columns are resized
     * @private
     */
    handleColumnResize: function () {
      var self = this;
      self.updateHandlerPosition();
      self.setIndicatorHeight();
    },

    /**
     * Handler when header is (re)rendered
     * @private
     */
    handleHeaderRender: function () {
      var self = this;
      // Wait for callstack to be cleared
      _.defer(function () {
        self.setHeaderElements();
        self.render();
        self.updateHandlerPosition();
      });
    },

    /**
     * Handler for when a column is removed
     * @param {Backgrid.Column} model
     * @param {Backgrid.Columns} collection
     * @private
     */
    handleColumnRemove: function (model, collection) {
      // Get position of removed model
      var removedPosition = model.get("displayOrder");

      // Update position values of models
      collection.each(function (mod) {
        if (mod.get("displayOrder") > removedPosition) {
          mod.set("displayOrder", mod.get("displayOrder") - 1, {silent: true});
        }
      });
    },

    /**
     * Updates the position of all handlers
     * @private
     */
    updateHandlerPosition: function () {
      var self = this;
      self.indicatorPositions = {};

      _.each(self.indicators, function ($indicator, indx) {
        var cell = $indicator.data("column-cell");
        var index = $indicator.data("column-index");

        var left;
        if (cell) {
          left = cell.$el.position().left;
        }
        else {
          var prevCell = self.indicators[indx - 1].data("column-cell");
          left = prevCell.$el.position().left + prevCell.$el.width();
        }
        self.indicatorPositions[index] = {
          x: left,
          $el: $indicator
        };

        // Get handler for current column and update position
        $indicator.css("left", left);
      });
      self.setIndicatorHeight();
    },

    /**
     * Finds and saves current column header elements
     * @private
     */
    setHeaderElements: function () {
      var self = this;
      var rows = self.header.headerRows || [self.header.row];
      self.headerCells = [];

      // Loop all rows
      _.each(rows, function (row) {
        // Loop cells of row
        _.each(row.cells, function (cell) {
          var columnModel = self.columns.get({cid: cell.column.cid});
          if (!_.isEmpty(columnModel)) {
            self.headerCells.push({
              $el: cell.$el,
              el: cell.el,
              column: columnModel
            });
          }
        });
      });

      // Sort cells
      self.headerCells = _.sortBy(self.headerCells, function (cell) {
        return self.columns.indexOf(cell.column);
      });

      self.headerElements = _.map(self.headerCells, function (cell) {
        return cell.el;
      });
    },

    /**
     * Adds a drag hook
     * @param {String} id
     * @param {Function} hook
     */
    addDragHook: function (id, hook) {
      this.dragHooks[id] = hook;
    },

    /**
     * Removes a drag hook
     * @param {String} id
     */
    removeDragHook: function (id) {
      if (this.dragHooks.hasOwnProperty(id)) {
        delete this.dragHooks[id];
      }
    },

    /**
     * Invokes a drag hook
     * @param {String} key
     * @private
     */
    dragHookInvoke: function (key) {
      var args = [].slice.apply(arguments);
      args.shift();
      _.each(this.dragHooks, function (obj) {
        if (typeof obj[key] == "function") {
          obj[key].apply(obj, args);
        }
      });
    },

    /**
     * Checks whether the ordering should be prevented
     * @returns {boolean}
     * @private
     */
    dragHookPreventOrder: function () {
      var prevent = false;
      _.each(this.dragHooks, function (obj) {
        if (typeof obj.preventOrder == "function") {
          prevent |= obj.preventOrder();
        }
      });
      return prevent;
    },

    /**
     * Helper function to stop event propagation
     * @param e
     * @private
     */
    _stopEvent: function (e) {
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      if (e.preventDefault) {
        e.preventDefault();
      }
      e.cancelBubble = true;
      e.returnValue = false;
    }
  });

  /**
   * Extendable
   * @type {Function}
   */
  var orderableDragHook = Backgrid.Extension.OrderableDragHook = function () {
    this.initialize.apply(this, arguments);
  };

  /**
   *  Prototype for the drag hook
   */
  _.extend(orderableDragHook.prototype, {
    initialize: function () {
    },
    dragStart: function () {
    },
    dragMove: function () {
    },
    dragEnd: function () {
    },
    preventOrder: function () {
    }
  });

  /**
   * Sample collection for orderable columns
   */
  Backgrid.Extension.OrderableColumns.orderableColumnCollection = Backgrid.Columns.extend({
    sortKey: "displayOrder",
    comparator: function(item) {
      return item.get(this.sortKey) || 1e6;
    },
    setPositions: function() {
      _.each(this.models, function(model, index) {
        // If a displayOrder is defined already, do not touch
        model.set("displayOrder", model.get("displayOrder") || index + 1, {silent: true});
      });
      return this;
    }
  });
}));
