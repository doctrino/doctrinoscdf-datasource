import { CustomVariableSupport, DataQueryRequest, MetricFindValue } from '@grafana/data';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataSource } from './datasource';
import { EquipmentVariableQuery } from './types';
import { VariableQueryEditor } from './components/VariableEditor';


export class EquipmentVariableSelection extends CustomVariableSupport<DataSource, EquipmentVariableQuery> {
  editor = VariableQueryEditor;

  constructor(private datasource: DataSource) {
    super();
  }

  query(request: DataQueryRequest<EquipmentVariableQuery>): Observable<{ data: MetricFindValue[] }> {
    // Input from user to dropdown used in Panel as a whole.
    const [query] = request.targets;
    const result = this.datasource.createEquipmentVariableDropdown(query);
    return from(result).pipe(map((data) => ({ data })));
  }
}
