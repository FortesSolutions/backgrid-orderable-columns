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
  else factory(root._, root.Backgrid, root.moment);

}(this, function (_, Backgrid) {
  "use strict";

  // Adds width support to columns
  Backgrid.Extension.OrderableColumns = Backbone.View.extend({
    /**
     Initializer.

     @param {Object} options
     @param {Backbone.Collection.<Backgrid.Column>|Array.<Backgrid.Column>|Array.<Object>} options.columns Column metadata.
     */
    initialize: function (options) {
      this.grid = options.grid;
      this.columns =  this.grid.columns;
      this.header =  this.grid.header;
      this.collection = options.grid.collection;
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
      view.createIndicators();

      // Attach
      var $rows = view.header.$el.find('tr');
      $rows.each(function(rowIndex, rowEl) {
        // Iterate over th elements
        $(rowEl).children("th").each(function(index, headerEl) {
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
            var stopEvent = function(e) {
              if(e.stopPropagation) e.stopPropagation();
              if(e.preventDefault) e.preventDefault();
              e.cancelBubble=true;
              e.returnValue=false;
            };

            // Make draggable
            $theader.on("mousedown", function(e) {
              stopEvent(e);
              var startX = $theader.position().left;
              var startPageX = e.pageX;
              var $doc = $(document);
              var $closestIndicator;

              // Helper function to find closest indicator
              var closest = null;
              var closestIndex = null;
              var validMove = false;
              var highlightClosestIndicator = function highlightClosestIndicator(newLeftPos) {
                $.each(view.indicatorPositions, function(indx){
                  if (closest == null || Math.abs(this - newLeftPos) < Math.abs(closest - newLeftPos)) {
                    closest = this;
                    closestIndex = indx;
                  }
                });

                if ($closestIndicator) {
                  $closestIndicator.removeClass('orderable-indicator-active');
                }

                var oldIndex = startIndex;
                var newIndex = closestIndex;
                var movedRight = oldIndex < newIndex;
                validMove = oldIndex != newIndex && ((movedRight && (newIndex < oldIndex + 1 ||
                  newIndex > oldIndex + columnSpan)) || !movedRight) && thresHoldPassed;
                if (validMove) {
                  $closestIndicator = view.indicators[newIndex].addClass('orderable-indicator-active');
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
              var mouseMoveHandler = function(evt) {
                stopEvent(evt);
                var newLeftPos = startX + (evt.pageX - startPageX);
                var delta = Math.abs(startX - newLeftPos);

                if (thresHoldPassed) {
                  // Highlight nearest indicator
                  highlightClosestIndicator(evt.pageX - view.grid.$el.offset().left);
                  $theader.addClass("orderable-ordering");

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
              var mouseUpHandler = function(evt) {
                // Cleanup
                stopEvent(evt);
                $columnDraggable.remove();
                if ($closestIndicator) {
                  $closestIndicator.removeClass('orderable-indicator-active');
                }
                $theader.removeClass("orderable-ordering");
                $doc.off("mouseup", mouseUpHandler);
                $doc.off("mousemove", mouseMoveHandler);

                if (validMove) {
                  var oldIndex = startIndex;
                  var newIndex = closestIndex;
                  var movedRight = oldIndex < newIndex;
                  var deltaIndex = newIndex - oldIndex;

                  view.columns.each(function(model, ind) {
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

                  // Update all relevant aspects
                  var columnSort = function() {
                    var $el = $(this);
                    var $el1 = $el.children().slice(oldIndex, oldIndex + columnSpan);
                    var $el2 = $el.children().eq(newIndex);
                    $el1.detach().insertBefore($el2);
                  };
                  view.grid.$el.find('tbody tr').each(columnSort);

                  // Trigger event indicating column reordering
                  view.columns.trigger("ordered");

                  // Sort columns
                  view.columns.sort();
                }
              };
              $doc.on("mouseup", mouseUpHandler);
            });
          }
        });
      });

      // Position drag handlers
      view.updateHandlerPosition();

      return this;
    },
    createIndicators: function() {
      var view = this;
      view.indicators = [];
      // For now, loop tds in first row
      _.each(view.headerElements, function(columnEl, index) {
        // Create helper elements
        view.indicators.push($("<div></div>")
          .addClass("orderable-indicator")
          .attr("data-column-index", index)
          .appendTo(view.$el)
          .height(view.grid.header.$el.height()));
      });
    },
    attachEvents: function() {
      this.listenTo(this.columns, "change:resizeAble", this.render);
      this.listenTo(this.columns, "resize", this.updateHandlerPosition);
      this.listenTo(this.grid.collection, "backgrid:header:rendered", function() {
        // Wait for callstack to be cleared
        // TODO: see if we can do without this delay function
        _.delay(function() {
          this.setHeaderElements();
          this.render();
          this.updateHandlerPosition();
        }.bind(this), 0);
      }.bind(this));
      this.listenTo(this.grid.collection, "backgrid:refresh", this.updateHandlerPosition);
    },
    updateHandlerPosition: function() {
      var view = this;
      view.indicatorPositions = [];
      _.each(view.headerElements, function(columnEl, index) {
        var $column = $(columnEl);
        var left = $column.position().left;
        view.indicatorPositions.push(left);

        // Get handler for current column and update position
        view.$el.children().filter("[data-column-index='" + index + "']")
          .css("left", $column.position().left);
      });
    },
    setHeaderElements: function() {
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

        $rows.each(function(index, row) {
          // Loop all cells
          $(row).children("th").each(function(ind, cell) {
            var $cell = $(cell);
            if (($cell.attr("colspan") == 1 || typeof $cell.attr("colspan") == "undefined") &&
              ($cell.attr("rowspan") == rowAmount - index ||
                (index + 1 === rowAmount && typeof $cell.attr("rowspan") == "undefined"))) {
              view.headerElements.push(cell);
            }
          });
        });

        // Sort array
        view.headerElements.sort(function(lhs, rhs){
          return parseInt($(lhs).offset().left,10) - parseInt($(rhs).offset().left,10);
        });
      }

      // Verification
      var unrenderableColCnt = view.columns.where({ renderable: false}).length;
      if (view.headerElements.length != (view.columns.size() - unrenderableColCnt)) {
        throw new RangeError("cannot determine header elements for every column.");
      }
    }
  });

}));