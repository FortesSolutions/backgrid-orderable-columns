/*
 backgrid-sizeable-columns
 http://github.com/wyuenho/backgrid

 Copyright (c) 2014
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
      view.header.$el.find('th').each(function(index, columnEl) {
        // Get matching col element
        var $column = $(columnEl);
        var $col = view.sizeAbleColumns.$el.find("col").eq(index);
        var columnModel = view.columns.get($col.data("column-id"));

        if (typeof columnModel == "undefined" || typeof columnModel.get("orderable") == "undefined" || columnModel.get("orderable")) {
          // Make draggable
          $column.on("mousedown", function(e) {
            var startX = $column.position().left;
            var startPageX = e.pageX;
            var $doc = $(document);
            var $closestIndicator;

            // Helper function to find closest indicator
            var closest = null;
            var closestIndex = null;
            var highlightClosestIndicator = function highlightClosestIndicator(newLeftPos) {
              $.each(view.indicatorPositions, function(index){
                if (closest == null || Math.abs(this - newLeftPos) < Math.abs(closest - newLeftPos)) {
                  closest = this;
                  closestIndex = index;
                }
              });

              if ($closestIndicator) {
                $closestIndicator.removeClass('orderable-indicator-active');
              }

              var oldIndex = index;
              var newIndex = closestIndex;
              var movedRight = oldIndex < newIndex;
              if (index != newIndex && ((movedRight && newIndex != oldIndex + 1) || !movedRight) && thresHoldPassed) {
                $closestIndicator = view.indicators[newIndex].addClass('orderable-indicator-active');
              }
            };

            // Create copy of column element
            var $columnDraggable = $("<div></div>")
              .addClass("orderable-draggable")
              .hide()
              .appendTo(view.$el)
              .width($column.outerWidth())
              .height($column.outerHeight())
              .css({
                left: startX,
                top: $column.position().top
              });

            // Follow the mouse
            var thresHoldPassed = false;
            var mouseMoveHandler = function(evt) {
              var newLeftPos = startX + (evt.pageX - startPageX);
              var delta = Math.abs(startX - newLeftPos);

              if (thresHoldPassed) {
                // Highlight nearest indicator
                highlightClosestIndicator(newLeftPos);
                $column.addClass("orderable-ordering");

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
              $columnDraggable.remove();
              if ($closestIndicator) {
                $closestIndicator.removeClass('orderable-indicator-active');
              }
              $column.removeClass("orderable-ordering");
              $doc.off("mouseup", mouseUpHandler);
              $doc.off("mousemove", mouseMoveHandler);

              var oldIndex = index;
              var newIndex = closestIndex;
              var movedRight = oldIndex < newIndex;
              if (index != newIndex && ((movedRight && newIndex != oldIndex + 1) || !movedRight) && thresHoldPassed) {
                view.columns.each(function(model, ind) {
                  if (movedRight) {
                    if (ind > Math.min(oldIndex, newIndex) && ind < Math.max(oldIndex, newIndex)) {
                      model.set('position', ind, {silent: true});
                    }
                    else if (index == ind) {
                      model.set('position', newIndex, {silent: true});
                    }
                  }
                  else {
                    if (ind >= Math.min(oldIndex, newIndex) && ind < Math.max(oldIndex, newIndex)) {
                      model.set('position', ind + 2, {silent: true});
                    }
                    else if (index == ind) {
                      model.set('position', newIndex + 1, {silent: true});
                    }
                  }
                });

                // Update all relevant aspects
                var columnSort = function() {
                  var $el = $(this);
                  var $el1 = $el.children().eq(oldIndex);
                  var $el2 = $el.children().eq(newIndex);
                  $el1.detach().insertBefore($el2);
                };
                view.grid.$el.find('tbody tr').each(columnSort);
                view.columns.sort();

                // Trigger event indicating column reordering
                view.columns.trigger("ordered", columnModel, oldIndex, columnModel.get("position"));
              }

              // Set new position values
              evt.preventDefault();
            };
            $doc.on("mouseup", mouseUpHandler);

            e.preventDefault();
          });
        }
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
      this.listenTo(this.columns, "resize", this.render);
      this.listenTo(this.columns, "add remove sort", function() {
        this.setHeaderElements();
        this.render();
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
          .css("left", $column.position().left + "px");
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