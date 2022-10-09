const isFunction = maptalks.Util.isFunction;
const isNil = maptalks.Util.isNil;

class ExtendDrawTool extends maptalks.DrawTool {
    _clickHandler(event) {
        const map = this.getMap();
        const registerMode = this._getRegisterMode();
        // const coordinate = event['coordinate'];
        // dbclick will trigger two click
        if (this._clickCoords && this._clickCoords.length) {
            const len = this._clickCoords.length;
            const prjCoord = map._pointToPrj(event['point2d']);
            if (this._clickCoords[len - 1].equals(prjCoord)) {
                return;
            }
        }
        if (!this._geometry) {
            this._createGeometry(event);
        } else {
            let prjCoord = map._pointToPrj(event['point2d']);
            if (!isNil(this._historyPointer)) {
                this._clickCoords = this._clickCoords.slice(0, this._historyPointer);
            }
            // for snap effect
            const snapTo = this._geometry.snapTo;
            if (snapTo && isFunction(snapTo)) {
                let containerPoint = event.containerPoint;
                const lastContainerPoints = [];
                if (this.options.edgeAutoComplete) {
                    const lastCoord = this._clickCoords[(this._historyPointer || 1) - 1];
                    lastContainerPoints.push(map._prjToContainerPoint(lastCoord));
                    const beforeLastCoord = this._clickCoords[(this._historyPointer || 1) - 2];
                    if (beforeLastCoord) {
                        lastContainerPoints.push(map._prjToContainerPoint(beforeLastCoord));
                    }
                }
                const snapResult = snapTo(containerPoint, lastContainerPoints);
                containerPoint = (snapResult.effectedVertex ? snapResult.point : snapResult) || containerPoint;
                prjCoord = map._containerPointToPrj(containerPoint);
                if (snapResult.effectedVertex) {
                    const additionVertex = snapResult.effectedVertex.map(vertex => map._containerPointToPrj(vertex));
                    this._clickCoords = this._clickCoords.concat(additionVertex);
                }
                // ensure snap won't trigger again when dblclick
                if (this._clickCoords[this._clickCoords.length - 1].equals(prjCoord)) {
                    return;
                }
            }
            this._clickCoords.push(prjCoord);
            this._historyPointer = this._clickCoords.length;
            event.drawTool = this;
            registerMode['update'](this.getMap().getProjection(), this._clickCoords, this._geometry, event);
            if (this.getMode() === 'point') {
                this.endDraw(event);
                return;
            }
            /**
             * drawvertex event.
             *
             * @event DrawTool#drawvertex
             * @type {Object}
             * @property {String} type - drawvertex
             * @property {DrawTool} target - draw tool
             * @property {Geometry} geometry - geometry drawn
             * @property {Coordinate} coordinate - coordinate of the event
             * @property {Point} containerPoint  - container point of the event
             * @property {Point} viewPoint       - view point of the event
             * @property {Event} domEvent                 - dom event
             */
            if (this._clickCoords.length <= 1) {
                this._fireEvent('drawstart', event);
            } else {
                this._fireEvent('drawvertex', event);
            }

            if (registerMode['clickLimit'] && registerMode['clickLimit'] === this._historyPointer) {
                // registerMode['update']([coordinate], this._geometry, event);
                this.endDraw(event);
            }
        }
    }

    /**
     * handle mouse move event
     * @param event
     * @private
     */
    _mouseMoveHandler(event) {
        const map = this.getMap();
        if (!map || map.isInteracting()) {
            return;
        }
        if (this.getMode() === 'point' && !this._geometry) {
            this._createGeometry(event);
            return;
        }
        let containerPoint = this._getMouseContainerPoint(event);
        if (!this._isValidContainerPoint(containerPoint)) {
            return;
        }
        let prjCoord = map._pointToPrj(event['point2d']);
        // for snap effect
        let snapAdditionVertex = [];
        const snapTo = this._geometry.snapTo;
        if (snapTo && isFunction(snapTo)) {
            const lastContainerPoints = [];
            if (this.options.edgeAutoComplete) {
                const lastCoord = this._clickCoords[(this._historyPointer || 1) - 1];
                lastContainerPoints.push(map._prjToContainerPoint(lastCoord));
                const beforeLastCoord = this._clickCoords[(this._historyPointer || 1) - 2];
                if (beforeLastCoord) {
                    lastContainerPoints.push(map._prjToContainerPoint(beforeLastCoord));
                }
            }
            const snapResult = snapTo(containerPoint, lastContainerPoints);
            containerPoint = (snapResult.effectedVertex ? snapResult.point : snapResult) || containerPoint;
            prjCoord = map._containerPointToPrj(containerPoint);
            if (snapResult.effectedVertex) {
                snapAdditionVertex = snapResult.effectedVertex.map(vertex => map._containerPointToPrj(vertex));
            }
        }
        const projection = map.getProjection();
        event.drawTool = this;
        const registerMode = this._getRegisterMode();
        if (this._shouldRecordHistory(registerMode.action)) {
            const path = this._clickCoords.slice(0, this._historyPointer);
            if (path && path.length > 0 && prjCoord.equals(path[path.length - 1])) {
                return;
            }
            registerMode['update'](projection, path.concat(snapAdditionVertex, [prjCoord]), this._geometry, event);
        } else {
            // free hand mode
            registerMode['update'](projection, prjCoord, this._geometry, event);
        }
        /**
         * mousemove event.
         *
         * @event DrawTool#mousemove
         * @type {Object}
         * @property {String} type - mousemove
         * @property {DrawTool} target - draw tool
         * @property {Geometry} geometry - geometry drawn
         * @property {Coordinate} coordinate - coordinate of the event
         * @property {Point} containerPoint  - container point of the event
         * @property {Point} viewPoint       - view point of the event
         * @property {Event} domEvent                 - dom event
         */
        this._fireEvent('mousemove', event);
    }
}
