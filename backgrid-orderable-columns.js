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
  // Browser
  else {
    factory(root._, root.Backgrid, root.moment);
  }

}(this, function (_, Backgrid) {
  "use strict";

  // Adds width support to columns
  Backgrid.Extension.OrderableColumns = Backbone.View.extend({
    dragHooks: {},
    /**
     Initializer.

     @param {Object} options
     @param {Backbone.Collection.<Backgrid.Column>|Array.<Backgrid.Column>|Array.<Object>} options.columns Column metadata.
     */
    initialize: function (options) {
      this.grid = options.grid;
      this.columns = this.grid.columns;
      this.header = this.grid.header;
      this.collection = this.grid.collection;
      this.sizeAbleColumns = options.sizeAbleColumns;
      this.moveThreshold = options.moveThreshold || 10;
      this.attachEvents();
      this.setHeaderElements();
    },

    /**
     Renders a column group.
     */
    render: function () {
      var view = this;
      view.$el.empty();

      // Create indicators
      view.addIndicators();

      // Attach
      var $rows = view.header.$el.find('tr');
      $rows.each(function (rowIndex, rowEl) {
        // Iterate over th elements
        $(rowEl).children("th").each(function (index, headerEl) {
          // Get matching col element(s)
          var $theader = $(headerEl);

          var columnModel;
          var orderable;
          var startIndex = _.indexOf(view.headerElements, headerEl);
          var columnSpan = 1;
          if (startIndex > -1) {
            var $col = view.sizeAbleColumns.$el.find("col").eq(startIndex);
            columnModel = view.columns.get($col.data("column-id"));
            orderable = typeof columnModel.get("orderable") == "undefined" || columnModel.get("orderable");
          }
          else {
            console.log('yeahh');
            orderable = false;
            var headerRows = view.grid.header.headerRows;
            if (headerRows) {
              var subColumnNames = headerRows[rowIndex].columns.at(index).get("childColumns");
              startIndex = view.columns.indexOf(view.columns.get(_.first(view.columns.where({ name: subColumnNames[0]}))));
              columnSpan = subColumnNames.length;
              orderable = true;
            }
          }

          if (orderable) {
            // Event helper function
            var stopEvent = function (e) {
              if (e.stopPropagation) {
                e.stopPropagation();
              }
              if (e.preventDefault) {
                e.preventDefault();
              }
              e.cancelBubble = true;
              e.returnValue = false;
            };

            // Make draggable
            $theader.on("mousedown", function (e) {
              // Check if left-click
              if (e.which === 1) {
                stopEvent(e);
                var startX = $theader.position().left;
                var startPageX = e.pageX;
                var $doc = $(document);
                var $closestIndicator;

                // Helper function to find closest indicator
                var closest = null;
                var closestIndex = null;
                var validMove = false;
                var orderPrevented = false;
                var highlightClosestIndicator = function highlightClosestIndicator(newLeftPos, evt) {
                  _.each(view.indicatorPositions, function (val, indx) {
                    if (closest == null || Math.abs(val - newLeftPos) < Math.abs(closest - newLeftPos)) {
                      closest = val;
                      closestIndex = indx;
                    }
                  });

                  // Remove current indicator
                  if ($closestIndicator) {
                    $closestIndicator.removeClass('orderable-indicator-active');
                  }

                  var newIndex = closestIndex;
                  var movedRight = startIndex < newIndex;
                  validMove = startIndex != newIndex && ((movedRight && (newIndex < startIndex + 1 ||
                    newIndex > startIndex + columnSpan)) || !movedRight) && thresHoldPassed;
                  if (!view.dragHookPreventOrder($columnDraggable, evt, columnModel)) {
                    if (validMove) {
                      $closestIndicator = view.indicators[newIndex].addClass('orderable-indicator-active');
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
                  .appendTo(view.$el)
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
                  stopEvent(evt);
                  var newLeftPos = startX + (evt.pageX - startPageX);
                  var delta = Math.abs(startX - newLeftPos);

                  // Only move beyond threshold
                  if (thresHoldPassed) {
                    // If first drag, notify drag hooks
                    if (!dragStarted) {
                      dragStarted = true;

                      // Notify drag hooks
                      view.dragHookInvoke("dragStart", evt, columnModel);
                    }

                    // Highlight nearest indicator
                    highlightClosestIndicator(evt.pageX - view.grid.$el.offset().left, evt);
                    $theader.addClass("orderable-ordering");

                    // Notify drag hooks
                    view.dragHookInvoke("dragMove", $columnDraggable, evt, columnModel);

                    // Apply mouse change to handler
                    $columnDraggable.css({
                      left: newLeftPos
                    }).show();
                  }
                  else if (delta >= view.moveThreshold) {
                    thresHoldPassed = true;
                  }

                };
                $doc.on("mousemove", mouseMoveHandler);

                // Add handler to listen for mouseup
                var mouseUpHandler = function (evt) {
                  // Cleanup
                  stopEvent(evt);
                  $columnDraggable.remove();
                  if ($closestIndicator) {
                    $closestIndicator.removeClass('orderable-indicator-active');
                  }
                  $theader.removeClass("orderable-ordering");
                  $doc.off("mouseup", mouseUpHandler);
                  $doc.off("mousemove", mouseMoveHandler);
                  dragStarted = false;

                  // Notify drag hooks
                  view.dragHookInvoke("dragEnd", evt, columnModel);

                  if (validMove && !orderPrevented) {
                    var oldIndex = startIndex;
                    var newIndex = closestIndex;
                    var movedRight = oldIndex < newIndex;
                    var deltaIndex = newIndex - oldIndex;

                    // Update position attributes
                    view.columns.each(function (model, ind) {
                      if (movedRight) {
                        if (ind >= oldIndex && ind < oldIndex + columnSpan) {
                          model.set('position', model.get("position") + deltaIndex - columnSpan, {silent: true});

                        }
                        else if (ind > oldIndex && ind < newIndex) {
                          model.set('position', model.get("position") - columnSpan, {silent: true});
                        }
                      }
                      else {
                        if (ind >= oldIndex && ind < oldIndex + columnSpan) {
                          model.set('position', model.get("position") + deltaIndex, {silent: true});

                        }
                        else if (ind > newIndex && ind < oldIndex) {
                          model.set('position', model.get("position") + columnSpan, {silent: true});
                        }
                        else if (newIndex == ind) {
                          model.set('position', model.get("position") + columnSpan, {silent: true});
                        }
                      }
                    });

                    /*// Update all relevant aspects
                     var columnSort = function () {
                     var $el = $(this);
                     var $children = $el.children();
                     var $el1 = $children.slice(oldIndex, oldIndex + columnSpan);

                     if (newIndex == $children.length) {
                     $el1.detach().insertAfter($children.eq(newIndex - 1));
                     }
                     else {
                     $el1.detach().insertBefore($children.eq(newIndex));
                     }
                     };
                     view.grid.$el.find('tbody tr').each(columnSort);*/

                    // Trigger event indicating column reordering
                    view.columns.trigger("ordered");

                    // Sort columns
                    view.columns.sort();

                    // Refresh body
                    view.grid.body.refresh();
                  }
                };
                $doc.on("mouseup", mouseUpHandler);
              }
            });
          }
        });
      });

      // Position drag handlers
      view.updateHandlerPosition();

      return this;
    },
    addIndicators: function () {
      var view = this;
      view.indicators = [];

      // For now, loop tds in first row
      _.each(view.headerElements, function (columnEl, index) {
        view.$el.append(view.createIndicator(index));
      });
      view.$el.append(view.createIndicator(view.headerElements.length));

      // Set indicator height
      view.setIndicatorHeight();
    },
    createIndicator: function (index) {
      var view = this;

      // Create helper elements
      var $indicator = $("<div></div>")
        .addClass("orderable-indicator")
        .attr("data-column-index", index);
      view.indicators.push($indicator);

      return $indicator;
    },
    setIndicatorHeight: function () {
      var view = this;
      _.each(view.indicators, function (indicatorEl) {
        $(indicatorEl).height(view.grid.header.$el.height());
      });
    },
    attachEvents: function () {
      var view = this;
      view.listenTo(view.columns, "change:resizeAble", view.render);
      view.listenTo(view.columns, "resize", view.handleColumnResize);
      view.listenTo(view.columns, "remove", view.handleColumnRemove);
      view.listenTo(view.grid.collection, "backgrid:header:rendered", view.handleHeaderRender);
      view.listenTo(view.grid.collection, "backgrid:refresh", view.updateHandlerPosition);
    },
    handleColumnResize: function () {
      var view = this;
      view.updateHandlerPosition();
      view.setIndicatorHeight();
    },
    handleHeaderRender: function () {
      var view = this;
      // Wait for callstack to be cleared
      // TODO: see if we can do without this delay function
      _.delay(function () {
        view.setHeaderElements();
        view.render();
        view.updateHandlerPosition();
      }, 0);
    },
    handleColumnRemove: function (model, collection) {
      // Get position of removed model
      var removedPosition = model.get("position");

      // Update position values of models
      collection.each(function (mod) {
        if (mod.get("position") > removedPosition) {
          mod.set("position", mod.get("position") - 1, {silent: true});
        }
      });
    },
    updateHandlerPosition: function () {
      var view = this;
      view.indicatorPositions = [];
      _.each(view.headerElements, function (columnEl, index) {
        var $column = $(columnEl);
        var left = $column.position().left;
        view.indicatorPositions.push(left);

        // Get handler for current column and update position
        view.$el.children().filter("[data-column-index='" + index + "']")
          .css("left", left);

        // Check if last column
        if (index == view.headerElements.length - 1) {
          left += $column.width();
          view.$el.children().filter("[data-column-index='" + view.headerElements.length + "']")
            .css("left", left);
          view.indicatorPositions.push(left);
        }
      });
    },
    setHeaderElements: function () {
      var view = this;
      var $headerEl = view.grid.header.$el;
      var $rows = $headerEl.children("tr");
      view.headerElements = [];

      // Loop rows to find header cells; currently this method does not support header columns with a colspan > 1.
      if ($rows.length < 2) {
        view.headerElements = $rows.children();
      }
      else {
        // Get all rows in the header
        var rowAmount = $rows.length;

        $rows.each(function (index, row) {
          // Loop all cells
          $(row).children("th").each(function (ind, cell) {
            var $cell = $(cell);
            if (($cell.attr("colspan") == 1 || typeof $cell.attr("colspan") == "undefined") &&
              ($cell.attr("rowspan") == rowAmount - index ||
                (index + 1 === rowAmount && typeof $cell.attr("rowspan") == "undefined"))) {
              view.headerElements.push(cell);
            }
          });
        });

        // Sort array
        view.headerElements.sort(function (lhs, rhs) {
          return parseInt($(lhs).offset().left, 10) - parseInt($(rhs).offset().left, 10);
        });
      }

      // Verification
      var unrenderableColCnt = view.columns.where({ renderable: false}).length;
      if (view.headerElements.length != (view.columns.size() - unrenderableColCnt)) {
        throw new RangeError("cannot determine header elements for every column.");
      }
    },
    addDragHook: function (id, hook) {
      this.dragHooks[id] = hook;
      /*if (hook instanceof orderableDragHook) {
       this.dragHooks[id] = hook;
       }
       else {
       throw "supplied hook >" + id + "< not of instance 'orderableDragHook'";
       }*/
    },
    removeDragHook: function (id) {
      if (this.dragHooks.hasOwnProperty(id)) {
        delete this.dragHooks[id];
      }
    },
    dragHookInvoke: function (key) {
      var args = [].slice.apply(arguments);
      args.shift();
      _.each(this.dragHooks, function (obj) {
        if (typeof obj[key] == "function") {
          obj[key].apply(obj, args);
        }
      });
    },
    dragHookPreventOrder: function () {
      var prevent = false;
      _.each(this.dragHooks, function (obj) {
        if (typeof obj.preventOrder == "function") {
          prevent |= obj.preventOrder();
        }
      });
      return prevent;
    }
  });

  var orderableDragHook = Backgrid.Extension.OrderableDragHook = function () {
    this.initialize.apply(this, arguments);
  };

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
}));